import { ProgressTracker, ProgressTrackerOptions } from "../progress-tracker";
import { ScopeContext } from "../scope/scope-context";

interface ScopeVariable<T> {}

interface FeatureCallback<TCallbackFunc extends (...params: any) => any> {
  invoke(...params: Parameters<TCallbackFunc>): void;
}

export abstract class Feature {
  // abstract localScopeVariable<T>(key: symbol | string): ScopeVariable<T>;

  createCallback<T extends (...params: any) => any>(): FeatureCallback<T> {
    return null!;
  }
}

export class ProgressFeature extends Feature {
  create(
    scope: ScopeContext,
    options: ProgressTrackerOptions
  ): ProgressTracker {
    return new ProgressTracker({
      ...options,
      onUpdate: (tracker) => this.onProgress.invoke(tracker),
    });
  }

  onProgress = this.createCallback<(tracker: ProgressTracker) => void>();
}

//#region Mappers - Robot run properties

type FeatureCallbacks<TFeature extends Feature> = {
  [K in keyof TFeature as TFeature[K] extends FeatureCallback<
    infer TCallbackFunc
  >
    ? K
    : never]: TFeature[K] extends FeatureCallback<infer TCallbackFunc>
    ? TCallbackFunc
    : never;
};

export interface FeatureRunProperties<T extends Feature> {
  callbacks: FeatureCallbacks<T>;
}

//#endregion

//#region Mappers - Scope context

export type FeatureContext<T extends Feature> = {
  [K in keyof T as ExcludeNonContextFields<
    K,
    T[K]
  >]: ExcludeFirstScopeParameter<T[K]>;
};

type ExcludeNonContextFields<TKey, TField> = TField extends FeatureCallback<any>
  ? never
  : TField extends () => FeatureCallback<any>
  ? never
  : TKey;

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

//#endregion
