import { ScopeException } from "../exceptions";
import { Logger } from "../util/logger";
import { getEntrypointContext } from "./entrypoint";
import {
  Feature,
  FeatureRunProperties,
  mapFeatureToRunProperties,
} from "./feature";
import { DataFeature } from "./feature/features/data";
import { Process } from "./process";
import { Robot } from "./robot";
import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/root-scope-context";
import { RobotOutputData } from "./types";

export type RobotRunStatus =
  | "initial"
  | "running"
  | "finished"
  | "errored"
  | "cancelling"
  | "cancelled";

/**
 * RobotRun is a class for controlling the execution of a given robot task.
 *
 * Instances of RobotRun are typically created in an entrypoint (robot method decorated with {@link Entrypoint}),
 * by calling {@link Robot.entrypoint}.
 *
 * RobotRun allows you to configure initial robot parameters and connect callbacks.
 *
 * After the run is configured, the robot can be started by calling {@link start}().
 */
export class RobotRun<TData, TReturn> {
  #robot: Robot;
  #fn: () => Promise<TReturn>;

  #status: RobotRunStatus = "initial";
  #rootScope: RootScopeContext;
  #runPromise?: Promise<any>;

  #featureProperties = new Map<new () => Feature, FeatureRunProperties<any>>();

  #entrypointName: string;

  constructor(robot: Robot, fn: () => Promise<TReturn>) {
    this.#robot = robot;
    this.#fn = fn;

    this.#entrypointName = getEntrypointContext().name;

    this.#rootScope = RootScopeContext.create(this.#entrypointName, robot);
    this.#rootScope.callbacks.onDataReceived = (type, data) => {
      if (!this.#rootScope.abortController.signal.aborted) {
        this.callbacks.onDataReceived({
          type,
          data,
        } as RobotOutputData<TData>);
      }
    };

    this.bootstrapFeatures();
  }

  private bootstrapFeatures() {
    this.feature(DataFeature);
  }

  get status() {
    return this.#status;
  }

  get rootScope() {
    return this.#rootScope;
  }

  /**
   * Returns {@link FeatureRunProperties} of a given feature.
   * Allows you to configure feature related parameters and connect callbacks.
   * @param Feature
   */
  feature<TFeature extends Feature>(
    Feature: new () => TFeature
  ): FeatureRunProperties<TFeature> {
    let properties = this.#featureProperties.get(Feature);
    if (!properties) {
      properties = mapFeatureToRunProperties(
        Feature,
        this.#rootScope.getFeatureConfiguration(Feature)
      );
      this.#featureProperties.set(Feature, properties);
    }
    return properties;
  }

  /**
   * Starts the robot and waits for it to end.
   */
  async start(): Promise<TReturn> {
    if (this.#status !== "initial") {
      throw new Error(
        `Only 'initial' status allows run to be started. Current: '${
          this.#status
        }'`
      );
    }

    this.#status = "running";
    Logger.verbose(`Running entrypoint ${this.#entrypointName}`);

    Process.registerRobotRun(this);

    this.#runPromise = runWithInitialScope(() => {
      Feature.runCallback("onRootScopeEnter", this.#rootScope);
      const result = this.#fn()
        .catch((e) => {
          this.#status = "errored";

          if (e instanceof ScopeException) {
            Feature.runCallback("onScopeError", this.#rootScope, e.scope, e);
            throw e.original;
          } else {
            Feature.runCallback(
              "onScopeError",
              this.#rootScope,
              this.#rootScope,
              e
            );
            throw e;
          }
        })
        .finally(() => {
          // TODO: Should scope exit be called if root scope errors?
          Feature.runCallback("onScopeExit", this.#rootScope);
          Process.unregisterRobotRun(this);
        });
      return result;
    }, this.#rootScope);

    const result = await this.#runPromise;

    this.#status = "finished";
    Logger.verbose(`Robot action '${this.#entrypointName}' finished`);

    this.callbacks.onFinished();

    return result;
  }

  /**
   * Cancels the execution and invokes onCancelled callback.
   * Cancellation is realised by using {@link RootScopeContext.abortController}.
   * @param timeout How long to wait for robot to finish in milliseconds.
   * Will wait indefinitely if undefined.
   * @returns Boolean indicating whether the cancellation was successful (it didn't timeout)
   */
  async cancel(timeout: number | undefined = 30_000): Promise<boolean> {
    // TODO: Consider waiting for all scopes to exit/throw before calling
    if (this.#status !== "running") {
      throw new Error(
        `The run has to be in status 'running' to be cancelled. Current: '${
          this.#status
        }'`
      );
    }

    this.#status = "cancelling";

    this.#rootScope.abortController.abort();

    let success: boolean;

    // If timeout is set to zero, don't wait at all
    if (timeout == 0) {
      Logger.verbose("Cancelling immediately");
      success = true;
    }
    // If it's undefined, wait indefinitely
    else if (timeout === undefined) {
      Logger.verbose("Waiting for robot to finish...");
      success = true;
      await this.#runPromise!;
      Logger.verbose("Cancelled");
    }
    // If timeout is set, wait with a timeout
    else {
      Logger.verbose(
        `Waiting for robot to finish with a timeout of ${timeout}ms...`
      );

      success = await Promise.race([
        this.#runPromise!.catch(() => true).then(() => true),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), timeout);
        }),
      ]);

      if (success) {
        Logger.verbose("Cancelled successfully");
      } else {
        Logger.verbose(
          "Cancellation timed out. Some tasks might still be active."
        );
      }
    }

    Process.unregisterRobotRun(this);

    this.#status = "cancelled";

    this.callbacks.onCancelled();

    return success;
  }

  readonly callbacks = {
    onDataReceived: (output: RobotOutputData<TData>) => {},
    onFinished: () => {},
    onCancelled: () => {},
  };
}
