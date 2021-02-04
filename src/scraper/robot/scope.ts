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

interface ScopeContext {
  parent: ScopeContext | null;
  name: string;
  executionName: string;
}

const scopeStorage = new AsyncLocalStorage<ScopeContext>();

export function getCurrentScope(): ScopeContext {
  const scope = scopeStorage.getStore();
  if (!scope) {
    throw new Error("Attempted to get current scope outside a scope");
  }
  return scope;
}

export function wrapWithScope<T extends (...params: any[]) => any>(
  callback: T,
  name: string,
  paramsMetadata: ScopeParamMetadata[]
) {
  return function (this: any, ...params: any[]) {
    const newScope = inheritScope(
      getCurrentScope(),
      name,
      formatScopeParams(params, paramsMetadata)
    );
    return scopeStorage.run(newScope, () => {
      return callback.apply(this, params);
    });
  };
}

export function wrapWithInitialScope<T extends (...params: any[]) => any>(
  fn: T
) {
  return scopeStorage.run(initRootScope(), fn);
}

export function initRootScope(name?: string): ScopeContext {
  return {
    parent: null,
    name: name ?? "ROOT",
    executionName: name ?? "ROOT",
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

// TODO: Get the name automatically. I used to wonder why libraries often don't do that. Now I understand why.
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
