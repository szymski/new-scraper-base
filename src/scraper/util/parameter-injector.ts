// TypeScript 4.1 won't allow me to do magic with function mapping - I can't ignore parameters of specific type
// on a function. Fortunately TS 4.2 makes it possible, but we have to wait for release.
// TODO: Update - TS 4.2 was released :)

import "reflect-metadata";
import { addMethodMetadata } from "../robot/metadata-helpers";

const INJECTED_PARAMS_KEY = Symbol("InjectedParams");

export type InjectedParamMetadata = { index: number; type: string };

export function InjectParam(type: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const metadata = {
      type,
      index: parameterIndex,
    };
    addMethodMetadata(INJECTED_PARAMS_KEY, target, propertyKey, metadata);
  };
}

export function getMethodInjectedParams(
  target: any,
  methodName: string | symbol
): InjectedParamMetadata[] {
  return Reflect.getOwnMetadata(INJECTED_PARAMS_KEY, target, methodName) ?? [];
}

type ClassMethods<T> = {
  [K in keyof T as T[K] extends (...params: infer Params) => infer Return
    ? K
    : never]: T[K];
};

// This type was borrowed from jest's spyOn method, I couldn't get MethodName to be a valid class index
type ClassMethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T] &
  string;

export function invokeAndInjectParams<
  TClass extends {},
  MethodName extends ClassMethodNames<TClass>
>(
  thisArg: TClass & ClassMethods<TClass>,
  methodName: MethodName,
  providers: Record<string, any>,
  params: TClass[MethodName] extends (...args: infer Params) => any
    ? Partial<Params>
    : never
): TClass[MethodName] extends (...args: any[]) => any
  ? ReturnType<TClass[MethodName]>
  : never {
  const method: any = thisArg[methodName];
  const paramsMetadata = getMethodInjectedParams(
    Object.getPrototypeOf(thisArg),
    methodName as string
  );

  for (const { index, type } of paramsMetadata) {
    params[index] = providers[type];
  }

  return method.apply(thisArg, params);
}
