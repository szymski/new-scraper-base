import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

/**
 * DataFeature is a generic feature for reporting and receiving output data from robots.
 * Reporting data using it requires you to pass a type identifier for the data.
 *
 * If you want a customized method and callback for passing data, use {@link defineOutputData}.
 */
export class DataFeature extends Feature {
  reportData(scope: ScopeContext, type: string, data: any) {
    this.onDataReceived.invoke(type, data);
  }

  onDataReceived = this.createCallback<(type: string, data: any) => void>();
}

/**
 * Defines a custom feature for reporting output data of a given type.
 * Returns a feature class which can be accessed to report data.
 * The callback as well as the function to report data supports code completion.
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
