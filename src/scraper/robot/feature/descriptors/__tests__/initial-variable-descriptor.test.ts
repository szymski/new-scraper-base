import { mockRootScope, mockScope } from "../../../test-helpers";
import { Feature } from "../../feature-class";

describe("Initial variable descriptor tests", () => {
  class TestFeature extends Feature {
    variable = this.createInitialVariable<string>("InitialVariable");
    withInitializer = this.createInitialVariable<number>("WithInit", () => 123);
  }

  test("Should set value of config variable", () => {
    mockRootScope((root) => {
      const feat = root.feature(TestFeature);
      const featConfig = root.getFeatureConfiguration(TestFeature);

      feat.variable.setValue(featConfig, "Hello world");

      expect(featConfig.getVariable(feat.variable.id)).toEqual("Hello world");
    });
  });

  test("Should get value of config variable", () => {
    mockRootScope((root) => {
      const feat = root.feature(TestFeature);
      const featConfig = root.getFeatureConfiguration(TestFeature);
      featConfig.setVariable(feat.variable.id, "test123");

      expect(feat.variable.value).toEqual("test123");
    });
  });

  test("Should get value of config variable from nested scope", () => {
    mockRootScope((root) => {
      const feat = root.feature(TestFeature);
      const featConfig = root.getFeatureConfiguration(TestFeature);
      featConfig.setVariable(feat.variable.id, "test123");

      mockScope((scope) => {
        expect(feat.variable.value).toEqual("test123");
      });
    });
  });

  test("Should initialize variable on get if undefined and initializer provided", () => {
    mockRootScope((root) => {
      const feat = root.feature(TestFeature);
      const featConfig = root.getFeatureConfiguration(TestFeature);

      expect(featConfig.getVariable(feat.withInitializer.id)).toBeUndefined();
      expect(feat.withInitializer.value).toEqual(123);
      expect(featConfig.getVariable(feat.withInitializer.id)).toEqual(123);
    });
  });
});
