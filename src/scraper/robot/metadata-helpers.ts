export interface ScopeMetadata {
  name: string;
  methodName: string;
}

export interface EntrypointMetadata {
  name: string;
  methodName: string;
}

export interface ScopeParamMetadata {
  index: number;
  name: string;
}

export const ClassMetadataKeys = {
  ScopeMethods: Symbol("ScopeMethods"),
  EntrypointMethods: Symbol("EntrypointMethods"),
} as const;

export const MethodMetadataKeys = {
  Scope: Symbol("Scope"),
  ScopeParam: Symbol("ScopeParam"),
} as const;

export function getScopeMethods(target: any): ScopeMetadata[] {
  return Reflect.getMetadata(ClassMetadataKeys.ScopeMethods, target) || [];
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
