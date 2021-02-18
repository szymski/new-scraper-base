import { getCurrentScope } from "../../scope";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export type ScopeVariableType = "default" | "local" | "root";

export class FeatureScopeVariableDescriptor<T> {
  readonly id: symbol;

  constructor(
    private FeatureConstructor: new () => Feature,
    readonly type: ScopeVariableType,
    readonly name?: string,
    readonly defaultInitializer?: (scope: ScopeContext) => T
  ) {
    this.id = Symbol(name);
  }

  get value(): T | undefined {
    const scope = getCurrentScope();
    let value = scope.get<T>(this.id);
    if (value === undefined && this.defaultInitializer) {
      value = this.defaultInitializer(scope);
      this.value = value;
    }
    return value;
  }

  set value(value: T | undefined) {
    const scope = getCurrentScope();
    if (this.type === "local") {
      scope.setLocal(this.id, value);
    }
    else if(this.type === "root") {
      scope.root.set(this.id, value);
    }
    else {
      scope.set(this.id, value);
    }
  }

  reset() {
    let value = undefined;
    if (this.defaultInitializer) {
      value = this.defaultInitializer(getCurrentScope());
    }
    this.value = value;
    return value;
  }
}
