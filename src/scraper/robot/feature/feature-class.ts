import { ScopeContext } from "../scope/scope-context";
import {
  FeatureCallbackDescriptor,
  FeatureScopeVariableDescriptor,
  InitialVariableDescriptor,
  ScopeDataTree,
} from "./descriptors";
import { OutputVariableDescriptor } from "./descriptors/output-variable-descriptor";
import { RootScopeVariableDescriptor } from "./descriptors/scope-variable-descriptor";
import { RootScopeContext } from "../scope/root-scope-context";

// TODO: Consider passing scope as a parameter only when attribute @Context() is added

interface FeatureCallbacks {
  onRootScopeEnter(scope: RootScopeContext): void;

  onScopeEnter(scope: ScopeContext): void;

  onScopeExit(scope: ScopeContext): void;

  onScopeError(scope: ScopeContext, source: ScopeContext, error: Error): void;
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

  createOutputVariable<T>(
    name: string,
    defaultInitializer?: () => T
  ): OutputVariableDescriptor<T> {
    return new OutputVariableDescriptor<T>(
      this.selfConstructor,
      name,
      defaultInitializer
    );
  }

  //#endregion

  //#region Callbacks

  /**
   * Called when root scope is entered.
   * Will be invoked only once for an entrypoint.
   */
  onRootScopeEnter(scope: RootScopeContext) {}

  /**
   * Called when a scope is entered (excluding root scope).
   * For root scope, see {@link onRootScopeEnter}.
   */
  onScopeEnter(scope: ScopeContext) {}

  /**
   * Called when a scope (including root scope) exits successfully.
   */
  onScopeExit(scope: ScopeContext) {}

  /**
   * Called when an exception is thrown withing a scope.
   *
   * Note: Will be called multiple times for a single error,
   * if it occurred down in the hierarchy and scopes don't catch it.
   * To identify whether the error was thrown in current scope,
   * compare {@param scope} with {@param source}.
   * TODO: Should AbortException be caught here?
   *
   * @param scope Current scope which errored
   * @param source The scope which originally threw the error
   * @param error The thrown error
   */
  onScopeError(scope: ScopeContext, source: ScopeContext, error: Error) {}

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
