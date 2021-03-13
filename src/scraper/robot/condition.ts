import {
  addClassMetadata,
  addMethodMetadata,
  ClassMetadataKeys,
  ConditionMetadata,
  MethodMetadataKeys,
  UseConditionMetadata,
} from "./metadata-helpers";

export interface ConditionMethods {
  verify(): Promise<boolean>;

  satisfy(): Promise<void>;
}

export interface ConditionOptions {
  /**
   * Indicates if verification should be performed before satisfying.
   * If false, satisfy method will always be called first on each robot run.
   */
  verifyFirst?: boolean;
}

// TODO: Condition function could be memoized
export function Condition(
  name: string,
  options?: ConditionOptions
): MethodDecorator {
  return <T extends number | any>(
    target: Object,
    propertyKey: string | symbol
  ) => {
    const metadata: ConditionMetadata = {
      name: name ?? propertyKey.toString(),
      methodName: propertyKey.toString(),
      options: options ?? {},
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
