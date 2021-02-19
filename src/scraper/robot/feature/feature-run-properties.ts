import { ScopeContext } from "../scope/scope-context";
import { FeatureConfiguration } from "./configuration";
import { FeatureCallbackDescriptor } from "./descriptors";
import { InitialVariableDescriptor } from "./descriptors/initial-variable-descriptor";
import { Feature } from "./feature-class";

/**
 * FeatureRunProperties is an object allowing to configure
 * a given {@link Feature} for a particular {@link RobotRun} (entrypoint).
 *
 * FeatureRunProperties maps 3 types of members:
 * - Initial variables (see {@link Feature.createInitialVariable}),
 * which are configurable parameters accessed by {@link Feature}
 * - Callbacks (see {@link Feature.createCallback}), which are invoked by feature instance
 * and can be received by FeatureRunProperties. Invocation source {@link ScopeContext} is passed
 * to each callback as the last parameter.
 * - Initial methods (all methods prefixed by *init_*), which make it easier to configure
 * features before you start the robot. When initial method is called from FeatureRunProperties,
 * {@link FeatureConfiguration} is always passed as the first parameter to the initial method.
 */
export type FeatureRunProperties<TFeature extends Feature> = {
  callbacks: FeatureCallbacks<TFeature>;
  variables: FeatureVariables<TFeature>;
} & FeatureInitialMethods<TFeature>;

/**
 * Takes all {@link FeatureCallbackDescriptor}s and maps them to a function
 * with {@link ScopeContext} added as the last parameter.
 */
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
 * Takes all {@link InitialVariableDescriptor}s and maps them into fields.
 */
type FeatureVariables<TFeature extends Feature> = {
  [K in keyof TFeature as TFeature[K] extends InitialVariableDescriptor<infer T>
    ? K
    : never]: TFeature[K] extends InitialVariableDescriptor<infer T>
    ? T
    : never;
};

/**
 * Takes all methods prefixed by *init_* and removes first {@link FeatureConfiguration} parameter.
 */
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

/**
 * Removes {@link FeatureConfiguration} parameter from a method if it's first.
 */
type WithoutConfigAsFirstParameter<T> = T extends (
  config: FeatureConfiguration,
  ...params: infer Params
) => infer TReturn
  ? (...params: Params) => TReturn
  : T;

/**
 * Maps {@link Feature} into {@link FeatureRunProperties} using {@link FeatureConfiguration}.
 * See {@link FeatureRunProperties} for more information.
 */
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
