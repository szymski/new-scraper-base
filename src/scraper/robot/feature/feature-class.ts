import { RootScopeContext } from "../scope/root-scope-context";
import { ScopeContext } from "../scope/scope-context";
import {
  FeatureCallbackDescriptor,
  FeatureScopeVariableDescriptor,
} from "./descriptors";
import { InitialVariableDescriptor } from "./descriptors/initial-variable-descriptor";
import { ScopeDataTree } from "./descriptors/scope-data-tree-descriptor";
import { RootScopeVariableDescriptor } from "./descriptors/scope-variable-descriptor";

// TODO: Consider passing scope as a parameter only when attribute @Context() is added

interface FeatureCallbacks {
  onRootScopeEnter(scope: RootScopeContext): void;

  onScopeEnter(scope: ScopeContext): void;

  onScopeExit(scope: ScopeContext): void;
}

/**
 * Base class for adding and managing functionalities of a scraper,
 * separately from other modules.
 */
export abstract class Feature implements FeatureCallbacks {
  private get selfConstructor() {
    return Object.getPrototypeOf(this).constructor;
  }

  //#region Descriptors

  createCallback<
    T extends (...params: any) => any
  >(): FeatureCallbackDescriptor<T> {
    return new FeatureCallbackDescriptor<T>(this.selfConstructor);
  }

  createScopeRootVariable<T>(
    name?: string,
    defaultInitializer?: (scope: ScopeContext) => T
  ): RootScopeVariableDescriptor<T> {
    return new FeatureScopeVariableDescriptor<T>(
      this.selfConstructor,
      "root",
      name,
      defaultInitializer
    );
  }

  createScopeVariable<T>(
    name?: string,
    defaultInitializer?: (scope: ScopeContext) => T
  ): FeatureScopeVariableDescriptor<T> {
    return new FeatureScopeVariableDescriptor<T>(
      this.selfConstructor,
      "default",
      name,
      defaultInitializer
    );
  }

  createLocalScopeVariable<T>(
    name?: string,
    defaultInitializer?: (scope: ScopeContext) => T
  ): FeatureScopeVariableDescriptor<T> {
    return new FeatureScopeVariableDescriptor<T>(
      this.selfConstructor,
      "local",
      name,
      defaultInitializer
    );
  }

  createScopeDataTree<T>(name?: string) {
    return new ScopeDataTree<T>(name);
  }

  createInitialVariable<T>(
    name: string,
    defaultInitializer?: () => T
  ): InitialVariableDescriptor<T> {
    return new InitialVariableDescriptor<T>(
      this.selfConstructor,
      name,
      defaultInitializer
    );
  }

  //#endregion

  //#region Callbacks

  // TODO: Tests for callbacks

  // TODO: On scope error

  onRootScopeEnter(scope: RootScopeContext) {}

  onScopeEnter(scope: ScopeContext) {}

  onScopeExit(scope: ScopeContext) {}

  static runCallback<TName extends keyof FeatureCallbacks>(
    name: TName,
    ...params: Parameters<FeatureCallbacks[TName]>
  ) {
    for (const instance of Feature.instances.values()) {
      // TODO: Get rid of any
      (instance[name] as any).call(instance, ...params);
    }
  }

  //#endregion

  //#region Static instances

  static instances = new Map<new () => Feature, Feature>();

  static getInstance<T extends Feature>(Feature: new () => T): T {
    let instance = this.instances.get(Feature);
    if (!instance) {
      instance = new Feature();
      this.instances.set(Feature, instance);
    }
    return instance as T;
  }

  //#endregion
}
