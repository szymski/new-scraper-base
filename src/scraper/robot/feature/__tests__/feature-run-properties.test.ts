import { ScopeContext } from "../../scope/scope-context";
import { FeatureConfiguration } from "../configuration";
import { Feature } from "../feature-class";
import { mapFeatureToRunProperties } from "../feature-run-properties";

describe("Feature run properties tests", () => {
  test("Should only map descriptors", () => {
    class TestFeature extends Feature {
      method() {}

      field = 123;
      onCallback = this.createCallback<(param1: number) => void>();
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
