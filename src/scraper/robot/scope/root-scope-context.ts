import { AbortController } from "abort-controller";
import { Robot } from "../robot";
import { ScopeContext } from "./scope-context";
import { ScopeCallbacks } from "./types";
import {
  Feature,
  FeatureConfiguration,
  FeatureContext,
  mapFeatureToContext,
} from "../feature";

export class RootScopeContext extends ScopeContext {
  readonly robot!: Robot;
  readonly callbacks: ScopeCallbacks = {
    onDataReceived(type: string, data: any) {},
  };
  readonly abortController: AbortController;

  readonly featureConfigurations = new Map<
    new () => Feature,
    FeatureConfiguration
  >();

  readonly featureContexts = new Map<new () => Feature, any>();

  protected constructor(data: Partial<RootScopeContext>) {
    super();
    Object.assign(this, data);
    this.data = {};
    this.abortController = new AbortController();
  }

  get root() {
    return this;
  }

  feature<T extends Feature>(Feature: { new (): T }): FeatureContext<T> {
    let context: FeatureContext<T> | undefined = this.featureContexts.get(
      Feature
    );
    if (!context) {
      context = mapFeatureToContext(Feature);
      this.featureContexts.set(Feature, context);
    }
    return context;
  }

  getFeatureConfiguration<T extends Feature>(
    Feature: new () => T
  ): FeatureConfiguration {
    let config = this.featureConfigurations.get(Feature);
    if (!config) {
      config = new FeatureConfiguration();
      this.featureConfigurations.set(Feature, config);
    }
    return config;
  }

  static create(name?: string, robot?: Robot) {
    return new RootScopeContext({
      robot,
      parent: null,
      name: name ?? "ROOT",
      executionName: name ?? "ROOT",
      fullName: name ?? "ROOT",
      fullExecutionName: name ?? "ROOT",
      startDate: new Date(),
    });
  }
}
