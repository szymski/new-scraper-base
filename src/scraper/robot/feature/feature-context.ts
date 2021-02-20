import { getCurrentScope } from "../scope";
import { ScopeContext } from "../scope/scope-context";
import { FeatureScopeVariableDescriptor } from "./descriptors";
import { FeatureCallbackDescriptor } from "./descriptors/callback-descriptor";
import { InitialVariableDescriptor } from "./descriptors/initial-variable-descriptor";
import { ScopeDataTree } from "./descriptors/scope-data-tree-descriptor";
import { Feature } from "./feature-class";

/**
 * FeatureContext is an object simplifying the usage
 * of {@link Feature} class from the inside of {@link Robot}.
 *
 * FeatureContext does not include initial variables and callbacks
 * from the original **TFeature** instance.
 */
export type FeatureContext<
  TFeature extends Feature
> = ExcludeMembersOfBaseClass<
  {
    [K in keyof TFeature as ExcludeNonContextFields<
      K,
      TFeature[K]
    >]: ExcludeFirstScopeParameter<TFeature[K]>;
  },
  Feature
>;

/**
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
  : TField extends InitialVariableDescriptor<any>
  ? TKey
  : TKey extends `init_${infer _}`
  ? never
  : TKey;

type ExcludeMembersOfBaseClass<T, TBase> = Omit<T, keyof TBase>;

/**
 * Maps {@link Feature} into a proxy to be used to access feature functionality from robots.
 * All feature methods will be wrapped in a function which adds current scope as the first parameter.
 * Scope variables are passed without modifications.
 */
export function mapFeatureToContext<TFeature extends Feature>(
  FeatureConstructor: new () => TFeature
): FeatureContext<TFeature> {
  const featureBaseMembers = new Set(
    Object.getOwnPropertyNames(Feature.prototype)
  );

  const instance = Feature.getInstance(FeatureConstructor);
  const featurePrototype = Object.getPrototypeOf(instance);

  const obj: Record<any, any> = {};

  // Map methods
  for (const key of Object.getOwnPropertyNames(featurePrototype)) {
    const value = featurePrototype[key];

    if (
      typeof value === "function" &&
      !key.startsWith("init_") &&
      !featureBaseMembers.has(key)
    ) {
      obj[key] = (...params: any[]) => {
        return value.call(instance, getCurrentScope(), ...params);
      };
    }
  }

  // Map descriptors
  for (const [key, value] of Object.entries(instance)) {
    if (value instanceof FeatureScopeVariableDescriptor) {
      obj[key] = value;
    } else if (value instanceof InitialVariableDescriptor) {
      obj[key] = value;
    } else if (value instanceof ScopeDataTree) {
      obj[key] = value;
    }
  }

  return obj as any;
}
