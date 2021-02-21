import { getCurrentScope } from "../../scope";
import { Feature } from "../feature-class";

// TODO: Tests

export class OutputVariableDescriptor<T> {
  readonly id: string;

  constructor(
    private FeatureConstructor: new () => Feature,
    readonly name: string,
    readonly defaultInitializer?: () => T
  ) {
    this.id = name;
  }

  get value(): T | undefined {
    let value = getCurrentScope()
      .root.getFeatureConfiguration(this.FeatureConstructor)
      .getOutput<T>(this.id);
    if (value) {
      return value;
    } else if (this.defaultInitializer) {
      value = this.defaultInitializer();
      this.value = value;
      return value;
    }
  }

  set value(value: T | undefined) {
    getCurrentScope()
      .root.getFeatureConfiguration(this.FeatureConstructor)
      .setOutput(this.id, value);
  }
}
