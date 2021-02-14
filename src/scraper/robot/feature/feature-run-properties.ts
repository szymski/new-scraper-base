import { ScopeContext } from "../scope/scope-context";
import { FeatureConfiguration } from "./configuration";
import { FeatureCallbackDescriptor } from "./descriptors";
import { Feature } from "./feature-class";

export interface FeatureRunProperties<T extends Feature> {
  callbacks: FeatureCallbacks<T>;
}

type FeatureCallbacks<TFeature extends Feature> = {
  [K in keyof TFeature as TFeature[K] extends FeatureCallbackDescriptor<
    infer TCallbackFunc
  >
    ? K
    : never]: TFeature[K] extends FeatureCallbackDescriptor<infer TCallbackFunc>
    ? WithScopeAsLastParameter<TCallbackFunc>
    : never;
};

/**
 * Returns function type with added parameter of type {@link ScopeContext}.
 */
type WithScopeAsLastParameter<T extends Function> = T extends (
  ...params: infer Params
) => infer Return
  ? (...params: [...params: Params, scope: ScopeContext]) => Return
  : never;

type A = WithScopeAsLastParameter<(first: number, second: string) => void>;

export function mapFeatureToRunProperties<TFeature extends Feature>(
  FeatureConstructor: new () => TFeature,
  config: FeatureConfiguration
): FeatureRunProperties<TFeature> {
  const instance = Feature.getInstance(FeatureConstructor);

  const callbacks = {};

  for (const [key, descriptor] of Object.entries(instance) as [string, any][]) {
    if (descriptor instanceof FeatureCallbackDescriptor) {
      Object.defineProperty(callbacks, key, {
        set(value: any) {
          config.assignCallback(descriptor.id, value);
        },
      });
      Object.defineProperty(callbacks, descriptor.id, {
        get() {
          // TODO
          // return config.callbacks[descriptor.id];
        },
      });
    }
  }

  return {
    callbacks: callbacks as FeatureCallbacks<TFeature>,
  };
}
