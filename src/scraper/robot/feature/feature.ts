import { FeatureCallbackDescriptor } from "./callback-descriptor";

// TODO: Consider passing scope as a parameter only when attribute @Context() is added

export abstract class Feature {
  // abstract localScopeVariable<T>(key: symbol | string): ScopeVariable<T>;

  createCallback<
    T extends (...params: any) => any
  >(): FeatureCallbackDescriptor<T> {
    // TODO: This black magic here is not fancy
    return new FeatureCallbackDescriptor<T>(
      (this as any).__proto__.constructor
    );
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
