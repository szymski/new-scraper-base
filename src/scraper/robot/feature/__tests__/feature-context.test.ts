import { ScopeContext } from "../../scope/scope-context";
import { mockScope } from "../../__tests__/helpers";
import { Feature } from "../feature";
import { mapFeatureToContext } from "../feature-context";

describe("Feature context tests", () => {
  describe("Feature to scope context mapping", () => {
    class TestFeature extends Feature {
      someField = 123;

      method1_no_params() {
        return "hello";
      }

      method2_take_scope(scope: ScopeContext) {
        return scope.name;
      }

      method3_with_params(scope: ScopeContext, a: number, b: number) {
        return a + b;
      }

      method4_preserve_this(scope: ScopeContext) {
        return this.someField;
      }

      method5_nested_call(scope: ScopeContext, param: string) {
        return this.method6_internal_method(param);
      }

      method6_internal_method(param: string) {
        return param + this.someField;
      }

      callback = this.createCallback<() => void>();
    }

    test("Should not map descriptors", () => {
      const mapped = mapFeatureToContext(TestFeature);
      expect(mapped).not.toHaveProperty("callback");
    });

    test("Should create a proxy for a method without parameters", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockScope(() => {
        expect(mapped).toHaveProperty("method1_no_params");
        expect(mapped.method1_no_params()).toEqual("hello");
      });
    });

    test("Should create a proxy and pass scope as first parameter implicitly", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockScope((scope) => {
        expect(mapped).toHaveProperty("method2_take_scope");
        expect(mapped.method2_take_scope()).toEqual(scope.name);
      });
    });

    test("Should create a proxy for a method with parameters", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockScope(() => {
        expect(mapped).toHaveProperty("method3_with_params");
        expect(mapped.method3_with_params(1, 2)).toEqual(3);
      });
    });

    test("Should preserve this when calling proxy", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockScope(() => {
        expect(mapped).toHaveProperty("method4_preserve_this");
        expect(mapped.method4_preserve_this()).toEqual(123);
      });
    });

    test("Should preserve and be able to call other methods", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockScope(() => {
        expect(mapped).toHaveProperty("method5_nested_call");
        expect(mapped.method5_nested_call("hello")).toEqual("hello123");
      });
    });
  });
});
