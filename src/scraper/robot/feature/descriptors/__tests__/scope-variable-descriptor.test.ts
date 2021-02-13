import { mockScope } from "../../../test-helpers";
import { Feature } from "../../feature-class";

describe("Feature scope variable descriptor tests", () => {
  class TestFeature extends Feature {
    nonLocal = this.createScopeVariable<string>("TestVariable");
    local = this.createLocalScopeVariable<string>("LocalTestVariable");
    withInitializer = this.createScopeVariable<string>(
      "WithInit",
      (scope) => `hello ${scope.name}`
    );
  }

  test("Should set non-local value", () => {
    mockScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "set");

      feature.nonLocal.value = "hello";

      expect(spy).toBeCalledWith(feature.nonLocal.id, "hello");
    });
  });

  test("Should set local value", () => {
    mockScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "setLocal");

      feature.local.value = "world";

      expect(spy).toBeCalledWith(feature.local.id, "world");
    });
  });

  test("Should get value", () => {
    mockScope((scope) => {
      const feature = scope.feature(TestFeature);
      scope.set(feature.nonLocal.id, 123);
      expect(feature.nonLocal.value).toEqual(123);
    });
  });

  test("Should initialize value on get", () => {
    mockScope((scope) => {
      const feature = scope.feature(TestFeature);
      const spy = jest.spyOn(scope, "set");

      expect(feature.withInitializer.value).toEqual("hello MOCK");

      expect(spy).toBeCalledWith(feature.withInitializer.id, "hello MOCK");
    });
  });

  test("Should reset", () => {
    mockScope((scope) => {
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
