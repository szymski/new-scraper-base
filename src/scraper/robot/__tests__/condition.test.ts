import { Condition, ConditionMethod, UseCondition } from "../condition";
import { Entrypoint } from "../entrypoint";
import {
  ClassMetadataKeys,
  ConditionMetadata,
  getScopeConditions,
} from "../metadata-helpers";
import { Robot } from "../robot";
import { Scope } from "../scope";

// TODO: Condition stacking

describe("Condition tests", () => {
  class TestRobot extends Robot {
    @Condition("condition")
    conditionFn(): ConditionMethod {
      return {
        verify: async () => true,
        satisfy: async () => {},
      };
    }

    @Entrypoint()
    @UseCondition("condition")
    testEntrypoint() {
      return this.entrypoint(async () => {});
    }

    @Entrypoint()
    @UseCondition("invalid-name")
    testInvalidConditionName() {
      return this.entrypoint(async () => {});
    }

    @Entrypoint()
    testInvalidConditionName2() {
      return this.entrypoint(() => this.scope1());
    }

    @Scope()
    @UseCondition("invalid-name")
    async scope1() {}
  }

  describe("Metadata", () => {
    test("Should save class condition metadata", () => {
      const meta = Reflect.getOwnMetadata(
        ClassMetadataKeys.ConditionMethods,
        TestRobot.prototype
      );
      expect(meta).toEqual([
        {
          name: "condition",
          methodName: "conditionFn",
        } as ConditionMetadata,
      ]);
    });

    test("Should save method condition metadata", () => {
      const meta = getScopeConditions(TestRobot.prototype, "testEntrypoint");
      expect(meta).toEqual([
        {
          name: "condition",
        } as ConditionMetadata,
      ]);
    });

    test("Should get and cache condition function return value", () => {
      const robot = new TestRobot();

      const value1 = robot.getCondition("condition");
      const value2 = robot.getCondition("condition");

      expect(value1).toHaveProperty("verify");
      expect(value1).toHaveProperty("satisfy");
      expect(value1).toBe(value2);
    });
  });

  test("Should throw when invalid condition name is used in entrypoint", async () => {
    const robot = new TestRobot();
    await expect(robot.testInvalidConditionName().start()).rejects.toThrow();
  });

  test("Should throw when invalid condition name is used in nested scope function", async () => {
    const robot = new TestRobot();
    await expect(robot.testInvalidConditionName2().start()).rejects.toThrow();
  });

});
