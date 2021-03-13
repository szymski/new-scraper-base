import {
  addClassMetadata,
  addMethodMetadata,
  ClassMetadataKeys,
  ConditionMetadata,
  MethodMetadataKeys, UseConditionMetadata,
} from "./metadata-helpers";

export interface ConditionMethod {
  verify(): Promise<boolean>;

  satisfy(): Promise<void>;
}

// TODO: Condition function could be memoized
export function Condition(name: string): MethodDecorator {
  return <T extends number | any>(
    target: Object,
    propertyKey: string | symbol
  ) => {
    const metadata: ConditionMetadata = {
      name: name ?? propertyKey.toString(),
      methodName: propertyKey.toString(),
    };
    addClassMetadata(target, ClassMetadataKeys.ConditionMethods, metadata);
  };
}

export function UseCondition(name: string): MethodDecorator {
  return <T extends number | any>(
    target: Object,
    propertyKey: string | symbol
  ) => {
    const metadata: UseConditionMetadata = {
      name: name,
    };
    addMethodMetadata(
      MethodMetadataKeys.ScopeConditions,
      target,
      propertyKey,
      metadata
    );
  };
}
