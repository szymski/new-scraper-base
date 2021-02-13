import { getCurrentScope } from "../scope";
import { ScopeContext } from "../scope/scope-context";
import { FeatureCallbackDescriptor } from "./descriptors/callback-descriptor";
import { Feature } from "./feature-class";

export type FeatureContext<T extends Feature> = {
  [K in keyof T as ExcludeNonContextFields<
    K,
    T[K]
  >]: ExcludeFirstScopeParameter<T[K]>;
};

/**
 *
 * If **T** is a function which takes {@link ScopeContext} as the first parameter,
 * maps to a function with this first parameter excluded.
 */
type ExcludeFirstScopeParameter<T> = T extends (
  scope: ScopeContext,
  ...params: infer RestParams
) => infer Return
  ? (...params: RestParams) => Return
  : T;

type ExcludeNonContextFields<
  TKey,
  TField
> = TField extends FeatureCallbackDescriptor<any>
  ? never
  : TField extends () => FeatureCallbackDescriptor<any>
  ? never
  : TKey;

/**
 * Maps {@link Feature} into a proxy to be used to access feature functionality from robots.
 * All feature methods will be wrapped in a function which adds current scope as the first parameter.
 */
export function mapFeatureToContext<TFeature extends Feature>(
  FeatureConstructor: new () => TFeature
): FeatureContext<TFeature> {
  const instance = Feature.getInstance(FeatureConstructor);
  const featurePrototype = Object.getPrototypeOf(instance);

  const obj: Record<any, any> = {};
  for (const key of Object.getOwnPropertyNames(featurePrototype)) {
    const value = featurePrototype[key];
    if (typeof value === "function") {
      obj[key] = (...params: any[]) => {
        return value.call(instance, getCurrentScope(), ...params);
      };
    }
  }
  // TODO

  return obj as any;
}
