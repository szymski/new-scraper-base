import { ScopeContext } from "../../scope/scope-context";
import { mockParentScope } from "../../test-helpers";
import { Feature } from "../feature-class";
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

      init_method() {}

      callback = this.createCallback<() => void>();

      variable = this.createScopeVariable<string>("TestVariable");
    }

    test("Should not map descriptors", () => {
      const mapped = mapFeatureToContext(TestFeature);
      expect(mapped).not.toHaveProperty("callback");
    });

    test("Should not map methods prefixed with init_", () => {
      const mapped = mapFeatureToContext(TestFeature);
      expect(mapped).not.toHaveProperty("init_method");
    });

    test("Should not map methods from base class", () => {
      const mapped = mapFeatureToContext(TestFeature);
      expect(mapped).not.toHaveProperty("createCallback");
    });

    test("Should create a proxy for a method without parameters", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope(() => {
        expect(mapped).toHaveProperty("method1_no_params");
        expect(mapped.method1_no_params()).toEqual("hello");
      });
    });

    test("Should create a proxy and pass scope as first parameter implicitly", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope((scope) => {
        expect(mapped).toHaveProperty("method2_take_scope");
        expect(mapped.method2_take_scope()).toEqual(scope.name);
      });
    });

    test("Should create a proxy for a method with parameters", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope(() => {
        expect(mapped).toHaveProperty("method3_with_params");
        expect(mapped.method3_with_params(1, 2)).toEqual(3);
      });
    });

    test("Should preserve this when calling proxy", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope(() => {
        expect(mapped).toHaveProperty("method4_preserve_this");
        expect(mapped.method4_preserve_this()).toEqual(123);
      });
    });

    test("Should preserve and be able to call other methods", () => {
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope(() => {
        expect(mapped).toHaveProperty("method5_nested_call");
        expect(mapped.method5_nested_call("hello")).toEqual("hello123");
      });
    });

    test("Should map scope variables", () => {
      const instance = Feature.getInstance(TestFeature);
      const mapped = mapFeatureToContext(TestFeature);

      mockParentScope(() => {
        expect(mapped).toHaveProperty("variable");
        expect(mapped.variable).toBe(instance.variable);
      });
    });
  });

  describe("Scope context", () => {
    test("Should return the same mapped feature context instance in scope context", () => {
      class TestFeature extends Feature {}

      mockParentScope((scope) => {
        const first = scope.feature(TestFeature);
        const second = scope.feature(TestFeature);

        expect(second).toBe(first);
      });
    });
  });
});
