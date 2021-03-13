import { Condition, ConditionMethods, UseCondition } from "../condition";
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
    conditionFn(): ConditionMethods {
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
          options: {},
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

      expect(value1.methods).toHaveProperty("verify");
      expect(value1.methods).toHaveProperty("satisfy");
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

  describe("Execution", () => {
    test("Should verify condition before executing entrypoint", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("true-condition")
        conditionFn(): ConditionMethods {
          return {
            verify: async () => {
              trackFn("verify");
              return true;
            },
            satisfy: async () => {},
          };
        }

        @Entrypoint()
        @UseCondition("true-condition")
        testEntrypoint() {
          return this.entrypoint(async () => {
            trackFn("entrypoint");
          });
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(2);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "entrypoint");
    });

    test("Should verify condition before executing scope", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("true-condition")
        conditionFn(): ConditionMethods {
          return {
            verify: async () => {
              trackFn("verify");
              return true;
            },
            satisfy: async () => {},
          };
        }

        @Entrypoint()
        testEntrypoint() {
          return this.entrypoint(async () => {
            await this.scope();
          });
        }

        @Scope()
        @UseCondition("true-condition")
        async scope() {
          trackFn("scope");
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(2);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "scope");
    });

    test("Should satisfy condition before executing entrypoint", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("condition")
        conditionFn(): ConditionMethods {
          let satisfied = false;
          return {
            verify: async () => {
              trackFn("verify");
              return satisfied;
            },
            satisfy: async () => {
              trackFn("satisfy");
              satisfied = true;
            },
          };
        }

        @Entrypoint()
        @UseCondition("condition")
        testEntrypoint() {
          return this.entrypoint(async () => {
            trackFn("entrypoint");
          });
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(4);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "satisfy");
      expect(trackFn).toHaveBeenNthCalledWith(3, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(4, "entrypoint");
    });

    test("Should satisfy condition before executing scope", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("condition")
        conditionFn(): ConditionMethods {
          let satisfied = false;
          return {
            verify: async () => {
              trackFn("verify");
              return satisfied;
            },
            satisfy: async () => {
              trackFn("satisfy");
              satisfied = true;
            },
          };
        }

        @Entrypoint()
        testEntrypoint() {
          return this.entrypoint(async () => {
            await this.scope();
          });
        }

        @Scope()
        @UseCondition("condition")
        async scope() {
          trackFn("scope");
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(4);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "satisfy");
      expect(trackFn).toHaveBeenNthCalledWith(3, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(4, "scope");
    });

    test("Should throw if condition failed to satisfy before executing entrypoint", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("condition")
        conditionFn(): ConditionMethods {
          return {
            verify: async () => {
              trackFn("verify");
              return false;
            },
            satisfy: async () => {
              trackFn("satisfy");
            },
          };
        }

        @Entrypoint()
        @UseCondition("condition")
        testEntrypoint() {
          return this.entrypoint(async () => {
            trackFn("entrypoint");
          });
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();

      await expect(run.start()).rejects.toThrow();

      expect(trackFn).toHaveBeenCalledTimes(3);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "satisfy");
      expect(trackFn).toHaveBeenNthCalledWith(3, "verify");
    });

    test("Should throw if condition failed to satisfy before executing scope", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("condition")
        conditionFn(): ConditionMethods {
          return {
            verify: async () => {
              trackFn("verify");
              return false;
            },
            satisfy: async () => {
              trackFn("satisfy");
            },
          };
        }

        @Entrypoint()
        testEntrypoint() {
          return this.entrypoint(async () => {
            trackFn("entrypoint");
            await this.scope();
          });
        }

        @Scope()
        @UseCondition("condition")
        async scope() {
          trackFn("scope");
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();

      await expect(run.start()).rejects.toThrow();

      expect(trackFn).toHaveBeenCalledTimes(4);
      expect(trackFn).toHaveBeenNthCalledWith(1, "entrypoint");
      expect(trackFn).toHaveBeenNthCalledWith(2, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(3, "satisfy");
      expect(trackFn).toHaveBeenNthCalledWith(4, "verify");
    });

    test("Should only satisfy condition once", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("condition")
        conditionFn(): ConditionMethods {
          let satisfied = false;
          return {
            verify: async () => {
              trackFn("verify");
              return satisfied;
            },
            satisfy: async () => {
              trackFn("satisfy");
              satisfied = true;
            },
          };
        }

        @Entrypoint()
        testEntrypoint() {
          return this.entrypoint(async () => {
            await this.scope();
            await this.scope();
          });
        }

        @Scope()
        @UseCondition("condition")
        async scope() {
          trackFn("scope");
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(5);
      expect(trackFn).toHaveBeenNthCalledWith(1, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(2, "satisfy");
      expect(trackFn).toHaveBeenNthCalledWith(3, "verify");
      expect(trackFn).toHaveBeenNthCalledWith(4, "scope");
      expect(trackFn).toHaveBeenNthCalledWith(5, "scope");
    });

    test("Should preserve this in condition callbacks", async () => {
      const trackFn = jest.fn();

      class TestRobot2 extends Robot {
        @Condition("true-condition")
        conditionFn(): ConditionMethods {
          let satisfied = false;
          return {
            verify: async () => {
              trackFn(this);
              return satisfied;
            },
            satisfy: async () => {
              trackFn(this);
              satisfied = true;
            },
          };
        }

        @Entrypoint()
        @UseCondition("true-condition")
        testEntrypoint() {
          return this.entrypoint(async () => {
            trackFn("entrypoint");
          });
        }
      }

      const robot = new TestRobot2();
      const run = robot.testEntrypoint();
      await run.start();

      expect(trackFn).toHaveBeenCalledTimes(4);
      expect(trackFn).toHaveBeenNthCalledWith(1, robot);
      expect(trackFn).toHaveBeenNthCalledWith(2, robot);
      expect(trackFn).toHaveBeenNthCalledWith(3, robot);
      expect(trackFn).toHaveBeenNthCalledWith(4, "entrypoint");
    });

    describe("Options", () => {
      test("Should skip verify and satisfy first if option set", async () => {
        const trackFn = jest.fn();

        class TestRobot2 extends Robot {
          @Condition("condition", { verifyFirst: false })
          conditionFn(): ConditionMethods {
            return {
              verify: async () => {
                trackFn("verify");
                return true;
              },
              satisfy: async () => {
                trackFn("satisfy");
              },
            };
          }

          @Entrypoint()
          @UseCondition("condition")
          testEntrypoint() {
            return this.entrypoint(async () => {
              trackFn("entrypoint");
            });
          }
        }

        const robot = new TestRobot2();
        const run = robot.testEntrypoint();
        await run.start();

        expect(trackFn).toHaveBeenCalledTimes(3);
        expect(trackFn).toHaveBeenNthCalledWith(1, "satisfy");
        expect(trackFn).toHaveBeenNthCalledWith(2, "verify");
        expect(trackFn).toHaveBeenNthCalledWith(3, "entrypoint");
      });
    });
    // TODO: If scope fails, check conditions
  });
});
