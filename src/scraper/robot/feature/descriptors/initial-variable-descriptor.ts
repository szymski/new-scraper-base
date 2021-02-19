import { getCurrentScope } from "../../scope";
import { FeatureConfiguration } from "../configuration";
import { Feature } from "../feature-class";

export class InitialVariableDescriptor<T> {
  readonly id: string;

  constructor(
    private FeatureConstructor: new () => Feature,
    readonly name: string,
    readonly defaultInitializer?: () => T
  ) {
    this.id = name;
  }

  get value(): T | undefined {
    const scope = getCurrentScope();
    const config = scope.root.getFeatureConfiguration(this.FeatureConstructor);
    let value = config.getVariable<T>(this.id);

    if (value === undefined && this.defaultInitializer) {
      value = this.defaultInitializer();
      config.setVariable(this.id, value);
    }

    return value;
  }

  setValue(config: FeatureConfiguration, value: T) {
    config.setVariable(this.id, value);
  }
}
