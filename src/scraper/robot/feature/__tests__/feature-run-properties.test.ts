import { ScopeContext } from "../../scope/scope-context";
import { FeatureConfiguration } from "../configuration";
import { Feature } from "../feature-class";
import { mapFeatureToRunProperties } from "../feature-run-properties";

describe("Feature run properties tests", () => {
  describe("Initial methods prefixed with 'init_'", () => {
    class TestFeature extends Feature {
      method1() {}

      init_method2(config: FeatureConfiguration, a: number, b: number) {}
    }

    test("Should map and remove 'init_' prefix", () => {
      const config = new FeatureConfiguration();
      const mapped = mapFeatureToRunProperties(TestFeature, config);

      expect(mapped).not.toHaveProperty("method1");
      expect(mapped).toHaveProperty("method2");
    });

    test("Should create a proxy which assigns configuration as first param", () => {
      const feature = Feature.getInstance(TestFeature);
      const spy = jest.spyOn(feature, "init_method2").mockReturnThis();

      const config = new FeatureConfiguration();
      const mapped = mapFeatureToRunProperties(TestFeature, config);

      mapped.method2(2, 3);

      expect(spy).toHaveBeenCalledWith(config, 2, 3);
      expect(spy).toHaveReturnedWith(feature);
    });
  });

  test("Should not map methods and fields", () => {
    class TestFeature extends Feature {
      constructor() {
        super();
      }

      method() {}

      field = 123;
      onCallback = this.createCallback<(param1: number) => void>();

      static asd = 5;
    }

    const config = new FeatureConfiguration();
    const mapped = mapFeatureToRunProperties(TestFeature, config);

    expect(Object.getOwnPropertyNames(mapped.callbacks)).toEqual([
      "onCallback",
    ]);
  });

  test("Should assign callback to config when assigning to properties", () => {
    class TestFeature extends Feature {
      onCallback = this.createCallback<(param1: number) => void>();
    }

    const featureInstance = Feature.getInstance(TestFeature);
    const descriptor = featureInstance.onCallback;

    const config = new FeatureConfiguration();
    const mapped = mapFeatureToRunProperties(TestFeature, config);

    const spy = jest.spyOn(config, "assignCallback");

    const fn = (param: number, scope: ScopeContext) => {};

    mapped.callbacks.onCallback = fn;

    expect(spy).toBeCalledWith(descriptor.id, fn);
  });

  test("Should create a proxy for initial variable", () => {
    class TestFeature extends Feature {
      variable = this.createInitialVariable<string>("Variable");
    }

    const featureInstance = Feature.getInstance(TestFeature);
    const descriptor = featureInstance.variable;

    const config = new FeatureConfiguration();
    const mapped = mapFeatureToRunProperties(TestFeature, config);

    expect(config.getVariable(descriptor.id)).toBeUndefined();
    mapped.variables.variable = "test";
    expect(config.getVariable(descriptor.id)).toEqual("test");
    expect(mapped.variables.variable).toEqual("test");
  });
});
