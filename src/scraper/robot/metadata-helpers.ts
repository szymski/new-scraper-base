export interface ScopeMetadata {
  name: string;
  methodName: string;
}

export interface EntrypointMetadata {
  name: string;
  methodName: string;
}

export interface ConditionMetadata {
  name: string;
  methodName: string;
}

export interface UseConditionMetadata {
  name: string;
}

export interface ScopeParamMetadata {
  index: number;
  name: string;
}

export const ClassMetadataKeys = {
  ScopeMethods: Symbol("ScopeMethods"),
  EntrypointMethods: Symbol("EntrypointMethods"),
  ConditionMethods: Symbol("ConditionMethods"),
} as const;

export const MethodMetadataKeys = {
  Scope: Symbol("Scope"),
  ScopeParam: Symbol("ScopeParam"),
  ScopeConditions: Symbol("ScopeConditions"),
} as const;

export function getScopeMethods(target: any): ScopeMetadata[] {
  return Reflect.getMetadata(ClassMetadataKeys.ScopeMethods, target) || [];
}

export function getClassConditions(target: any): ConditionMetadata[] {
  return Reflect.getMetadata(ClassMetadataKeys.ConditionMethods, target) || [];
}

export function getScopeConditions(
  target: any,
  propertyKey: string | symbol
): UseConditionMetadata[] {
  return (
    Reflect.getMetadata(
      MethodMetadataKeys.ScopeConditions,
      target,
      propertyKey
    ) || []
  );
}

export function getScopeParams(
  target: any,
  methodName: string
): ScopeParamMetadata[] {
  return (
    Reflect.getMetadata(MethodMetadataKeys.ScopeParam, target, methodName) || []
  );
}

export function addClassMetadata(target: any, key: symbol, value: any) {
  const params: any[] = Reflect.getOwnMetadata(key, target) || [];
  params.push(value);
  Reflect.defineMetadata(key, params, target);
}

export function addMethodMetadata(
  metadataKey: symbol,
  target: any,
  propertyKey: string | symbol,
  value: any
) {
  const params: any[] =
    Reflect.getOwnMetadata(metadataKey, target, propertyKey) || [];
  params.push(value);
  Reflect.defineMetadata(metadataKey, params, target, propertyKey);
}
