import { Feature, FeatureContext } from "../feature";
import { RootScopeContext } from "./root-scope-context";

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
    return this.root.feature(Feature);
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

  getLocal<T>(key: symbol | string): T | undefined {
    return this.localData[key];
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
    this.localData[key] = value;
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
