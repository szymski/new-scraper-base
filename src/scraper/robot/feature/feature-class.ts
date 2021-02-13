import { ScopeContext } from "../scope/scope-context";
import {
  FeatureCallbackDescriptor,
  FeatureScopeVariableDescriptor,
} from "./descriptors";

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

  createScopeVariable<T>(
    name?: string,
    defaultInitializer?: (scope: ScopeContext) => T
  ): FeatureScopeVariableDescriptor<T> {
    return new FeatureScopeVariableDescriptor<T>(this.selfConstructor, false, name, defaultInitializer);
  }

  createLocalScopeVariable<T>(
      name?: string,
      defaultInitializer?: (scope: ScopeContext) => T
  ): FeatureScopeVariableDescriptor<T> {
    return new FeatureScopeVariableDescriptor<T>(this.selfConstructor, true, name, defaultInitializer);
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
