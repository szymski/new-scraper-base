import { ScopeContext } from "../../scope/scope-context";
import { FeatureConfiguration } from "../configuration";

describe("Feature configuration tests", () => {
  describe("Callbacks", () => {
    test("Should do nothing if unassigned callback was invoked", () => {
      const config = new FeatureConfiguration();
      const symbol = Symbol("Test");

      config.invokeCallback(symbol, {} as ScopeContext, 1, 2);
    });

    test("Should assign and invoke the callback for a given symbol, with scope parameter added at the end", () => {
      const config = new FeatureConfiguration();
      const symbol = Symbol("Test");

      const fn = jest.fn((a: number, b: number, scope: ScopeContext) => {});
      const mockScope = {} as ScopeContext;

      config.assignCallback(symbol, fn);

      config.invokeCallback(symbol, mockScope, 1, 2);

      expect(fn).toBeCalledWith(1, 2, mockScope);
    });

    // TODO: Keep this or allow a list of callbacks?
    test("Should override callback if assigned twice", () => {
      const config = new FeatureConfiguration();
      const symbol = Symbol("Test");

      const fn = jest.fn((a: number, b: number) => {});
      const mockScope = {} as ScopeContext;

      config.assignCallback(symbol, () => {});

      config.assignCallback(symbol, fn);
      config.invokeCallback(symbol, mockScope, 1, 2);

      expect(fn).toBeCalledWith(1, 2, {});
    });
  });
});
