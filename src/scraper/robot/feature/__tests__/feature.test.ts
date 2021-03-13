import "../../robot"; // TODO: Test fails if this import is missing
import { Feature } from "../feature-class";

describe("Feature tests", () => {
  test("Should construct a single instance and always return it", () => {
    class TestFeature extends Feature {}

    const instance1 = Feature.getInstance(TestFeature);
    const instance2 = Feature.getInstance(TestFeature);

    expect(instance1).toBeInstanceOf(TestFeature);
    expect(instance2).toBe(instance1);
  });

  test("Should return separate instance for each feature", () => {
    class TestFeature1 extends Feature {}
    class TestFeature2 extends Feature {}

    const instance1 = Feature.getInstance(TestFeature1);
    const instance2 = Feature.getInstance(TestFeature2);

    expect(instance1).toBeInstanceOf(TestFeature1);
    expect(instance2).toBeInstanceOf(TestFeature2);
    expect(instance2).not.toBe(instance1);
  });
});
