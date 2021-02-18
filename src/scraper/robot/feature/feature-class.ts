import { ScopeContext } from "../scope/scope-context";
import {
  FeatureCallbackDescriptor,
  FeatureScopeVariableDescriptor,
} from "./descriptors";
import { ScopeDataTree } from "./descriptors/scope-data-tree-descriptor";

// TODO: Consider passing scope as a parameter only when attribute @Context() is added

/**
 * Base class for adding and managing functionalities of a scraper,
 * separately from other modules.
 */
export abstract class Feature {
  private get selfConstructor() {
    return Object.getPrototypeOf(this).constructor;
  }

  createCallback<
    T extends (...params: any) => any
  >(): FeatureCallbackDescriptor<T> {
    return new FeatureCallbackDescriptor<T>(this.selfConstructor);
  }

  createScopeRootVariable<T>(
    name?: string,
    defaultInitializer?: (scope: ScopeContext) => T
  ): FeatureScopeVariableDescriptor<T> {
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

  static instances = new WeakMap<new () => Feature, Feature>();

  static getInstance<T extends Feature>(Feature: new () => T): T {
    let instance = this.instances.get(Feature);
    if (!instance) {
      instance = new Feature();
      this.instances.set(Feature, instance);
    }
    return instance as T;
  }
}
