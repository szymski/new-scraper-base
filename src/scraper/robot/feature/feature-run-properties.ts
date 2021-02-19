import { ScopeContext } from "../scope/scope-context";
import { FeatureConfiguration } from "./configuration";
import { FeatureCallbackDescriptor } from "./descriptors";
import { InitialVariableDescriptor } from "./descriptors/initial-variable-descriptor";
import { Feature } from "./feature-class";

export type FeatureRunProperties<T extends Feature> = {
  callbacks: FeatureCallbacks<T>;
  variables: FeatureVariables<T>;
} & FeatureInitialMethods<T>;

type FeatureCallbacks<TFeature extends Feature> = {
  [K in keyof TFeature as TFeature[K] extends FeatureCallbackDescriptor<
    infer TCallbackFunc
  >
    ? K
    : never]: TFeature[K] extends FeatureCallbackDescriptor<infer TCallbackFunc>
    ? WithScopeAsLastParameter<TCallbackFunc>
    : never;
};

type FeatureVariables<TFeature extends Feature> = {
  [K in keyof TFeature as TFeature[K] extends InitialVariableDescriptor<infer T>
    ? K
    : never]: TFeature[K] extends InitialVariableDescriptor<infer T>
    ? T
    : never;
};

type FeatureInitialMethods<TFeature extends Feature> = {
  [K in keyof TFeature as K extends `init_${infer Name}`
    ? TFeature[K] extends (
        config: FeatureConfiguration,
        ...params: infer Params
      ) => infer TReturn
      ? Name
      : never
    : never]: WithoutConfigAsFirstParameter<TFeature[K]>;
};

/**
 * Returns function type with added parameter of type {@link ScopeContext}.
 */
type WithScopeAsLastParameter<T extends Function> = T extends (
  ...params: infer Params
) => infer Return
  ? (...params: [...params: Params, scope: ScopeContext]) => Return
  : never;

type WithoutConfigAsFirstParameter<T> = T extends (
  config: FeatureConfiguration,
  ...params: infer Params
) => infer TReturn
  ? (...params: Params) => TReturn
  : T;

export function mapFeatureToRunProperties<TFeature extends Feature>(
  FeatureConstructor: new () => TFeature,
  config: FeatureConfiguration
): FeatureRunProperties<TFeature> {
  const instance = Feature.getInstance(FeatureConstructor);
  const featurePrototype = Object.getPrototypeOf(instance);

  const callbacks = {};
  const variables = {};

  for (const [key, descriptor] of Object.entries(instance) as [string, any][]) {
    // Callbacks
    if (descriptor instanceof FeatureCallbackDescriptor) {
      Object.defineProperty(callbacks, key, {
        set(value: any) {
          config.assignCallback(descriptor.id, value);
        },
      });
    }

    // Initial variables
    else if (descriptor instanceof InitialVariableDescriptor) {
      Object.defineProperty(variables, key, {
        get() {
          return config.getVariable(descriptor.id);
        },
        set(value: any) {
          config.setVariable(descriptor.id, value);
        },
      });
    }

    // TODO: Tests for variables
  }

  // Map initial methods

  const methods: Record<string, any> = {};

  for (const key of Object.getOwnPropertyNames(featurePrototype)) {
    const value = featurePrototype[key];

    if (typeof value === "function" && key.startsWith("init_")) {
      const mappedKey = key.replace("init_", "");
      methods[mappedKey] = (...params: any[]) => {
        return value.call(instance, config, ...params);
      };
    }
  }

  return {
    callbacks: callbacks as FeatureCallbacks<TFeature>,
    variables: variables as FeatureVariables<TFeature>,
    ...methods,
  } as any;
}
