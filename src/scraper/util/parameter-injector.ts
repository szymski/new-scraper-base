// TypeScript 4.1 won't allow me to do magic with function mapping - I can't ignore parameters of specific type
// on a function. Fortunately TS 4.2 makes it possible, but we have to wait for release.
// TODO: Update - TS 4.2 was released :)

import "reflect-metadata";
import { addMethodMetadata } from "../robot/metadata-helpers";

const INJECTED_PARAMS_KEY = Symbol("InjectedParams");

export type InjectedParamMetadata = {
  index: number;
  type: string;
  provider?: () => any;
};

/**
 * Decorator which indicates that a parameter should be injected when
 * the function is invoked using {@link invokeAndInjectParams}.
 * @param type Type of the parameter, an identifier which allows to provide data when invoking.
 * @param provider Optional value provider. Initializes the value to be injected, if it's not provided on invocation.
 * @constructor
 */
export function Inject(type: string, provider?: () => any): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const metadata = {
      type,
      index: parameterIndex,
      provider,
    };
    addMethodMetadata(INJECTED_PARAMS_KEY, target, propertyKey, metadata);
  };
}

/**
 * Returns list of {@link InjectedParamMetadata} objects for a given method.
 * @param target Class prototype
 * @param methodName Method name
 */
export function getMethodInjectionMetadata(
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

/**
 * Invokes a class method and injects parameters marked with injection decorator {@link Inject}.
 * @param thisArg Class instance
 * @param methodName Name of the method to invoke
 * @param providers A dictionary where key is the injection type identifier and value is the value to inject.
 * If you need lazy initialization, the value can also be a function - in that case, its return value
 * will be evaluated only if the method accepts injected parameter of a given type.
 * @param params Parameters to invoke the method with. Parameters which are supposed to be injected
 * can be skipped by replacing them with null or undefined.
 */
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
  const paramsMetadata = getMethodInjectionMetadata(
    Object.getPrototypeOf(thisArg),
    methodName as string
  );

  for (const { index, type, provider: decoratorProvider } of paramsMetadata) {
    // First take local provider, then decorator-level provider
    const provider = providers[type] ?? decoratorProvider;
    // If provider is a function, use its return value
    params[index] = typeof provider === "function" ? provider() : provider;
  }

  return method.apply(thisArg, params);
}
