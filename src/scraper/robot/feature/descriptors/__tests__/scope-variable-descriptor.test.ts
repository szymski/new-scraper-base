import { getCurrentScope } from "../../../scope";
import { wrapWithScope } from "../../../scope/helpers";
import { mockParentScope, mockScope } from "../../../test-helpers";
import { Feature } from "../../feature-class";

describe("Feature scope variable descriptor tests", () => {
  class TestFeature extends Feature {
    nonLocal = this.createScopeVariable<string>("TestVariable");
    local = this.createLocalScopeVariable<string>("LocalTestVariable");
    withInitializer = this.createScopeVariable<string>(
      "WithInit",
      (scope) => `hello ${scope.name}`
    );
    root = this.createScopeRootVariable<string>("RootTestVariable");
  }

  test("Should set non-local value", () => {
    mockParentScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "set");

      feature.nonLocal.value = "hello";

      expect(spy).toBeCalledWith(feature.nonLocal.id, "hello");
    });
  });

  test("Should set local value", () => {
    mockParentScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "setLocal");

      feature.local.value = "world";

      expect(spy).toBeCalledWith(feature.local.id, "world");
    });
  });

  test("Should set root value", async () => {
    await mockParentScope(async (scope1) => {
      const fn = wrapWithScope(
        async () => {
          const scope2 = getCurrentScope();
          const feature = scope2.feature(TestFeature);
          feature.root.value = "hello root";
          expect(scope1.get(feature.root.id)).toEqual("hello root");
        },
        "scope2",
        []
      );

      await fn();
    });
  });

  test("Should get value", () => {
    mockParentScope((scope) => {
      const feature = scope.feature(TestFeature);
      scope.set(feature.nonLocal.id, 123);
      expect(feature.nonLocal.value).toEqual(123);
    });
  });

  test("Should get parent value", () => {
    mockParentScope((scope1) => {
      const feature = scope1.feature(TestFeature);
      feature.nonLocal.value = "scope1";
      mockScope((scope2) => {
        expect(feature.nonLocal.parentValue).toEqual("scope1");
        expect(feature.nonLocal.value).toEqual("scope1");
        feature.nonLocal.value = "scope2";
        expect(feature.nonLocal.parentValue).toEqual("scope1");
      });
      expect(feature.nonLocal.parentValue).toBeUndefined();
    });
  });

  test("Should get parent local value", () => {
    mockParentScope((scope1) => {
      const feature = scope1.feature(TestFeature);
      feature.local.value = "scope1";
      mockScope((scope2) => {
        expect(feature.local.value).toBeUndefined();
        expect(feature.local.parentLocalValue).toEqual("scope1");
      });
      expect(feature.local.parentLocalValue).toBeUndefined();
    });
  });

  test("Should initialize value on get", () => {
    mockParentScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "set");

      expect(feature.withInitializer.value).toEqual("hello MOCK");

      expect(spy).toBeCalledWith(feature.withInitializer.id, "hello MOCK");
    });
  });

  test("Should reset", () => {
    mockParentScope((scope) => {
      const feature = scope.feature(TestFeature);

      feature.withInitializer.value = "test";
      expect(feature.withInitializer.value).toEqual("test");
      expect(feature.withInitializer.reset()).toEqual("hello MOCK");
      expect(feature.withInitializer.value).toEqual("hello MOCK");

      feature.nonLocal.value = "asdf";
      expect(feature.nonLocal.value).toEqual("asdf");
      expect(feature.nonLocal.reset()).toEqual(undefined);
      expect(feature.nonLocal.value).toEqual(undefined);
    });
  });
});
