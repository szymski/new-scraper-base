import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class DataFeature extends Feature {
  reportData(scope: ScopeContext, type: string, data: any) {
    this.onDataReceived.invoke(type, data);
  }

  onDataReceived = this.createCallback<(type: string, data: any) => void>();
}

/**
 * Defines a custom feature for reporting output data of a given type.
 * Returns a feature class which can be accessed to report data.
 * @constructor
 */
export function defineOutputData<T>() {
  return class CustomOutputDataFeature extends Feature {
    reportData(scope: ScopeContext, data: T) {
      this.onDataReceived.invoke(data);
    }

    onDataReceived = this.createCallback<(data: T) => void>();
  };
}
