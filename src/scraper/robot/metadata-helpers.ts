export const ClassMetadataKeys = {
  ScopeMethods: Symbol("ScopeMethods"),
} as const;

export const MethodMetadataKeys = {
  Scope: Symbol("Scope"),
  ScopeParam: Symbol("ScopeParam"),
} as const;

export interface ScopeMetadata {
  name: string;
}

export interface ScopeParamMetadata {
  index: number;
  name: string;
}

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

export function formatScopeParams(
  params: any[],
  paramsMetadata: ScopeParamMetadata[]
) {
  return paramsMetadata
    .sort((a, b) => a.index - b.index > 0 ? 1 : -1)
    .map((meta) => `${meta.name}=${JSON.stringify(params[meta.index])}`)
    .join(",");
}
