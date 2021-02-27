import {
  getMethodInjectionMetadata,
  invokeFunctionAndInjectParams,
} from "../../util/parameter-injector";
import {
  addClassMetadata,
  addMethodMetadata,
  ClassMetadataKeys,
  getScopeParams,
  MethodMetadataKeys,
  ScopeMetadata,
  ScopeParamMetadata,
} from "../metadata-helpers";
import { wrapWithScope } from "./helpers";

export function Scope(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    propertyKey = propertyKey.toString();

    const metadata: ScopeMetadata = {
      name: name ?? propertyKey,
      methodName: propertyKey,
    };

    addClassMetadata(target, ClassMetadataKeys.ScopeMethods, metadata);

    Reflect.defineMetadata(
      MethodMetadataKeys.Scope,
      metadata,
      target,
      propertyKey
    );

    const methodParams = getScopeParams(target, propertyKey);

    const original = <any>descriptor.value;
    const injectionMetadata = getMethodInjectionMetadata(target, propertyKey);

    const wrappedWithInjection = (thisArg: any, args: any[]) => () =>
      invokeFunctionAndInjectParams(
        thisArg,
        original,
        injectionMetadata,
        {},
        args
      );

    descriptor.value = <any>function (this: any, ...args: any[]) {
      return wrapWithScope(
        wrappedWithInjection(this, args),
        name ?? propertyKey.toString(),
        methodParams
      ).apply(this, args);
    };
  };
}

// TODO: Get the param name automatically. I used to wonder why libraries often don't do that. Now I understand why.
export function ScopeParam(name: string): ParameterDecorator {
  return function (target: any, propertyKey: string | symbol, index: number) {
    const metadata: ScopeParamMetadata = {
      index,
      name,
    };
    addMethodMetadata(
      MethodMetadataKeys.ScopeParam,
      target,
      propertyKey,
      metadata
    );
  };
}
