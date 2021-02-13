import AbortController from "abort-controller";
import { Feature,FeatureConfiguration,FeatureContext,mapFeatureToContext } from "../feature";
import { Robot } from "../robot";
import { ScopeCallbacks } from "./types";

export class ScopeContext {
  #root!: RootScopeContext;
  readonly parent!: ScopeContext | null;

  readonly name!: string;
  readonly fullName!: string;
  readonly executionName!: string;
  readonly fullExecutionName!: string;

  protected data!: any;
  protected localData: any = {};

  startDate!: Date;
  endDate?: Date;
  totalDuration?: number;

  protected constructor(data?: Partial<ScopeContext> & { data: any }) {
    Object.assign(this, data ?? {});
  }

  feature<T extends Feature>(Feature: new () => T): FeatureContext<T> {
    // TODO: Don't create a new instance every time
    return mapFeatureToContext(Feature);
  }

  set root(value: RootScopeContext) {
    this.#root = value;
  }

  get root() {
    return this.#root;
  }

  get<T>(key: symbol | string): T | undefined {
    return this.localData[key] !== undefined
      ? this.localData[key]
      : ScopeContext.getNonLocalRecursively<T>(this, key);
  }

  // TODO: Come up with a better solution than recursive call
  protected static getNonLocalRecursively<T>(
    scope: ScopeContext,
    key: symbol | string
  ): T | undefined {
    const data = scope.data[key];
    if (data === undefined) {
      if (scope.parent) {
        return ScopeContext.getNonLocalRecursively(scope.parent, key);
      } else {
        return undefined;
      }
    }
    return data;
  }

  set<T>(key: symbol | string, value: T) {
    return (this.data[key] = value);
  }

  setLocal<T>(key: symbol | string, value: T) {
    return (this.localData[key] = value);
  }

  static inherit(parent: ScopeContext, name: string, formattedParams: string) {
    return new ScopeContext({
      root: parent.root,
      parent: parent,
      name,
      fullName: `${parent.fullName}.${name}`,
      executionName: `${name}(${formattedParams})`,
      fullExecutionName: `${parent.fullExecutionName}.${name}(${formattedParams})`,
      startDate: new Date(),
      data: {
        ...parent.data,
      },
    });
  }
}

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

  protected constructor(data: Partial<RootScopeContext>) {
    super();
    Object.assign(this, data);
    this.data = {};
    this.abortController = new AbortController();
  }

  get root() {
    return this;
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
