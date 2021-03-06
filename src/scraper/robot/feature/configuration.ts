import { ScopeContext } from "../scope/scope-context";

/**
 * Feature configuration is a per-root-scope container for feature related
 * configuration parameters, for example callbacks which can be invoked
 * inside of the scraping feature and then handled outside of the robot.
 *
 * FeatureConfiguration is an internal class which is meant to be used inside
 * feature methods/descriptors.
 *
 * For connecting callbacks to a run and accessing feature context,
 * please refer to {@link FeatureRunProperties} and {@link FeatureContext} accordingly.
 */
export class FeatureConfiguration {
  #callbacks: any = {};
  #variables: any = {};
  #outputs: any = {};

  /**
   * Registers a feature callback to be later invoked with {@link invokeCallback}.
   * @param key Identifier of the callback. This will be the id of descriptor {@link FeatureCallbackDescriptor.id}
   * @param fn Callback function
   */
  assignCallback(key: symbol, fn: (...params: any[]) => void) {
    this.#callbacks[key] = fn;
  }

  /**
   * Invokes a callback if it was assigned.
   * @param key Identifier of the callback. This will be the id of descriptor {@link FeatureCallbackDescriptor.id}
   * @param scope Current scope context
   * @param params List of parameters to invoke the callback with
   */
  invokeCallback(key: symbol, scope: ScopeContext, ...params: any[]) {
    const callback = this.#callbacks[key];
    if (callback) {
      callback(...params, scope);
    }
  }

  /**
   * Sets value of an initial configuration variable.
   * To be used from {@link RobotRun} instance.
   */
  setVariable(key: string, value: any) {
    this.#variables[key] = value;
  }

  /**
   * Gets value of an initial configuration variable.
   * To be used from {@link Feature} instance, ideally only from {@link InitialVariableDescriptor} class.
   */
  getVariable<T>(key: string): T {
    return this.#variables[key];
  }

  //TODO: Docs

  setOutput(key: string, value: any) {
    this.#outputs[key] = value;
  }

  getOutput<T>(key: string): T {
    return this.#outputs[key];
  }
}
