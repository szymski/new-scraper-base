import {mockScope} from "../../__tests__/helpers";
import {Feature} from "../feature";
import {FeatureCallbackDescriptor} from "../callback-descriptor";


describe("Feature callback descriptor tests", () => {
  test("Should invoke callback", () => {
    class TestFeature extends Feature {}

    const descriptor = new FeatureCallbackDescriptor<(a: number) => void>(
      TestFeature
    );

    mockScope((scope) => {
      const config = scope.getFeatureConfiguration(TestFeature);
      const spy = jest.spyOn(config, "invokeCallback");

      descriptor.invoke(5);

      expect(spy).toBeCalledWith(descriptor.id, scope, 5);
    });
  });
});

