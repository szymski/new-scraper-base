import { AsyncLocalStorage } from "async_hooks";
import "reflect-metadata";
import {
  ClassMetadataKeys,
  formatScopeParams,
  getScopeParams,
  MethodMetadataKeys,
  ScopeMetadata,
  ScopeParamMetadata,
} from "./metadata-helpers";
import { Robot } from "./robot";

export interface ScopeContext {
  parent: ScopeContext | null;
  name: string;
  executionName: string;
  startDate: Date;
  endDate?: Date;
  totalDuration?: number;
  robot: Robot;
}

const scopeStorage = new AsyncLocalStorage<ScopeContext>();

export function getCurrentScope(): ScopeContext {
  const scope = scopeStorage.getStore();
  if (!scope) {
    throw new Error("Attempted to get current scope outside a scope");
  }
  return scope;
}

export function getCurrentScopeNoFail(): ScopeContext | null {
  return scopeStorage.getStore() ?? null;
}

export function wrapWithScope<T extends (...params: any[]) => Promise<any>>(
  callback: T,
  name: string,
  paramsMetadata: ScopeParamMetadata[] = []
) {
  return function (this: any, ...params: any[]) {
    const scope = inheritScope(
      getCurrentScope(),
      name,
      formatScopeParams(params, paramsMetadata)
    );
    return scopeStorage.run(scope, () => {
      // TODO: Hooks
      // this?.onScopeStart(scope);
      return (
        callback
          .apply(this, params)
          // .catch((e: any) => {
          //   Logger.error(e);
          //   throw e;
          // })
          .then((result: any) => {
            scope.endDate = new Date();
            scope.totalDuration =
              scope.endDate.getTime() - scope.startDate.getTime();
            // this?.onScopeEnd(scope);
            return result;
          })
      );
    });
  };
}

export function runWithInitialScope<T extends (...params: any[]) => any>(
  fn: T,
  scope?: Partial<ScopeContext>
): ReturnType<T> {
  return scopeStorage.run(prepareInitialScope(scope ?? {}), fn);
}

function prepareInitialScope(scope: Partial<ScopeContext>): ScopeContext {
  return {
    parent: null,
    name: scope.name ?? "ROOT",
    executionName: scope.name ?? "ROOT",
    robot: scope.robot!,
    startDate: new Date(),
  };
}

function inheritScope(
  parent: ScopeContext,
  name: string,
  formattedParams: string
): ScopeContext {
  return {
    parent,
    name: `${parent.name}.${name}`,
    executionName: `${parent.executionName}.${name}(${formattedParams})`,
    startDate: new Date(),
    robot: parent.robot,
  };
}

export function Scope(name?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const metadata: ScopeMetadata = {
      name: name ?? propertyKey,
    };
    const params: ScopeMetadata[] =
      Reflect.getOwnMetadata(
        ClassMetadataKeys.ScopeMethods,
        target,
        propertyKey
      ) || [];
    params.push(metadata);
    Reflect.defineMetadata(ClassMetadataKeys.ScopeMethods, params, target);
    Reflect.defineMetadata(
      MethodMetadataKeys.Scope,
      metadata,
      target,
      propertyKey
    );
    const methodParams = getScopeParams(target, propertyKey);
    const original = descriptor.value;
    descriptor.value = function (this: any, ...args: any[]) {
      return wrapWithScope(original, name ?? propertyKey, methodParams).apply(
        this,
        args
      );
    };
  };
}

// TODO: Get the param name automatically. I used to wonder why libraries often don't do that. Now I understand why.
export function ScopeParam(name: string) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    index: number
  ) {
    const params: ScopeParamMetadata[] =
      Reflect.getOwnMetadata(
        MethodMetadataKeys.ScopeParam,
        target,
        propertyKey
      ) || [];
    params.push({
      index,
      name,
    } as ScopeParamMetadata);
    Reflect.defineMetadata(
      MethodMetadataKeys.ScopeParam,
      params,
      target,
      propertyKey
    );
  };
}
