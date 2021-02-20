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

  // TODO: Move this to a separate feature
  startDate!: Date;
  endDate?: Date;
  totalDuration?: number;

  protected constructor(data?: Partial<ScopeContext> & { data: any }) {
    Object.assign(this, data ?? {});
  }

  feature<T extends Feature>(Feature: new () => T): FeatureContext<T> {
    return this.root.feature(Feature);
  }

  /**
   * Returns {@link RootScopeContext}, which is the first scope
   * in the current execution context.
   */
  get root() {
    return this.#root;
  }

  set root(value: RootScopeContext) {
    this.#root = value;
  }

  /**
   * Gets scope data for a given key.
   * First attempts to take local value, if it's undefined,
   * gets value from the parent recursively.
   */
  get<T>(key: symbol | string): T | undefined {
    return this.localData[key] !== undefined
      ? this.localData[key]
      : ScopeContext.getNonLocalRecursively<T>(this, key);
  }

  /**
   * Gets local data value (data associated only to this particular scope).
   */
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

  /**
   * Sets scope data value for a given key.
   * The value will be passed down the hierarchy, when a child scope is created.
   */
  set<T>(key: symbol | string, value: T) {
    this.localData[key] = value;
    return (this.data[key] = value);
  }

  /**
   * Sets local data value for a given key.
   * Local value won't be passed to child scopes.
   */
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
