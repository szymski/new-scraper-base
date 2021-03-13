import { ConditionMethod } from "./condition";
import { DataFeature } from "./feature/features";
import { ConditionMetadata,getClassConditions } from "./metadata-helpers";
import { RobotRun } from "./robot-run";
import { getCurrentScope } from "./scope";
import { wrapWithScope } from "./scope/helpers";
import { Logger } from "../util/logger";

export class Robot {
  #conditions: ConditionMetadata[];
  #conditionValues = new Map<string, ConditionMethod>();

  constructor() {
    this.#conditions = getClassConditions(Object.getPrototypeOf(this));
  }

  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    return new RobotRun<TData, TReturn>(this, fn);
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().feature(DataFeature).reportData(type, data);
  }

  getCondition(name: string): ConditionMethod {
    const condition = this.#conditions.find(
      (condition) => condition.name === name
    );
    if (!condition) {
      throw new Error(
        `No such condition '${name}' is present in the class. Did you forget the Condition() decorator?`
      );
    }

    const cachedValue = this.#conditionValues.get(name);
    if (cachedValue) {
      return cachedValue;
    }

    const conditionMethod = (this as any)[condition.methodName];
    const conditionValue = conditionMethod.apply(this);

    if (!("verify" in conditionValue && "satisfy" in conditionValue)) {
      throw new Error(
        `Invalid value returned from '${name}' condition method. It must be a ConditionMethod interface and not a promise.`
      );
    }

    const wrapped = wrapConditionInScopes(conditionValue, name);

    this.#conditionValues.set(name, wrapped);

    return wrapped;
  }

  /// Experimental feature
  readonly _: {
    [K in keyof this]: this[K] extends (...args: infer Args) => infer Ret
      ? (...args: Partial<Args>) => Ret
      : never;
  } = this as any;
}

function wrapConditionInScopes(
  conditionValue: ConditionMethod,
  conditionName: string
): ConditionMethod {
  return {
    verify: wrapWithScope(conditionValue.verify, `condition[${conditionName}].verify`),
    satisfy: wrapWithScope(conditionValue.satisfy, `condition[${conditionName}].satisfy`),
  };
}
