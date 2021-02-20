import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "../util/logger";
import {
  Feature,
  FeatureRunProperties,
  mapFeatureToRunProperties,
} from "./feature";
import {
  addClassMetadata,
  ClassMetadataKeys,
  EntrypointMetadata,
} from "./metadata-helpers";
import { Robot } from "./robot";
import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/scope-context";
import { OutputTypeUnion, RobotRun } from "./types";

// TODO: Clean this mess, WTF, what did I do, lol

interface EntrypointContext {
  name: string;
}

const entrypointStorage = new AsyncLocalStorage<EntrypointContext>();

export function Entrypoint(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const context: EntrypointContext = {
      name: name ?? propertyKey.toString(),
    };
    const metadata: EntrypointMetadata = {
      name: name ?? propertyKey.toString(),
      methodName: propertyKey.toString(),
    };
    addClassMetadata(target, ClassMetadataKeys.EntrypointMethods, metadata);

    const original: any = descriptor.value;

    descriptor.value = function (this: any, ...params: any[]) {
      const robot = this;
      return entrypointStorage.run(context, () =>
        original.apply(robot, params)
      );
    } as any;
  };
}

export function getEntrypointContext() {
  const context = entrypointStorage.getStore();
  if (!context) {
    throw new Error(
      "Attempted to get entrypoint context outside an entrypoint. Did you forget to add @Entrypoint() decorator?"
    );
  }
  return context;
}

export function createEntrypointRun<TData, TReturn = any>(
  robot: Robot,
  fn: () => Promise<TReturn>
): RobotRun<TData, TReturn> {
  const entrypointContext = getEntrypointContext();

  let run: RobotRun<TData, TReturn>;

  const scope = RootScopeContext.create(entrypointContext.name, robot);
  scope.callbacks.onDataReceived = (type, data) => {
    if (!scope.abortController.signal.aborted) {
      run.callbacks.onDataReceived({
        type,
        data,
      } as OutputTypeUnion<TData>);
    }
  };

  const featureProperties = new Map<
    new () => Feature,
    FeatureRunProperties<any>
  >();

  const start = async () => {
    if (run.status !== "initial") {
      throw new Error(
        `Only 'initial' status allows run to be started. Current: '${run.status}'`
      );
    }

    Logger.verbose(`Running entrypoint ${entrypointContext.name}`);
    run.status = "running";
    const result = await runWithInitialScope(() => {
      Feature.runCallback("onRootScopeEnter", scope);
      const result = fn();
      Feature.runCallback("onScopeExit", scope);
      return result;
    }, scope);
    run.status = "finished";
    Logger.verbose(`Robot action '${entrypointContext.name}' finished`);
    run.callbacks.onFinished();
    return result;
  };

  run = {
    status: "initial",
    rootScope: scope,
    callbacks: {
      onDataReceived(data: OutputTypeUnion<TData>) {},
      onFinished() {},
      onCancelled() {},
    },
    start,
    async cancel() {
      if (run.status !== "running") {
        throw new Error(
          `The run has to be in status 'running' to be cancelled. Current: '${run.status}'`
        );
      }

      Logger.verbose("Cancelling run...");
      run.status = "cancelled";
      scope.abortController.abort();
      // TODO: Consider waiting for all scopes to exit/throw before calling
      run.callbacks.onCancelled();
    },
    feature<TFeature extends Feature>(
      Feature: new () => TFeature
    ): FeatureRunProperties<TFeature> {
      let properties = featureProperties.get(Feature);
      if (!properties) {
        properties = mapFeatureToRunProperties(
          Feature,
          this.rootScope.getFeatureConfiguration(Feature)
        );
        featureProperties.set(Feature, properties);
      }
      return properties;
    },
  };

  return run;
}
