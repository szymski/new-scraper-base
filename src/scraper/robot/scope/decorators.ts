import {
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
    const original = <any>descriptor.value;
    descriptor.value = <any>function (this: any, ...args: any[]) {
      return wrapWithScope(
        original,
        name ?? propertyKey.toString(),
        methodParams
      ).apply(this, args);
    };
  };
}

// TODO: Get the param name automatically. I used to wonder why libraries often don't do that. Now I understand why.
export function ScopeParam(name: string): ParameterDecorator {
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
