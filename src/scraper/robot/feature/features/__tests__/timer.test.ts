import { Entrypoint } from "../../../entrypoint";
import { Robot } from "../../../robot";
import { getCurrentScope } from "../../../scope";
import { sleepAsync } from "../../../test-helpers";
import { TimerFeature } from "../timer";

describe("Timer feature tests", () => {
  class TestRobot extends Robot {
    counter = 0;

    @Entrypoint()
    run1() {
      return this.entrypoint(async () => {
        getCurrentScope()
          .feature(TimerFeature)
          .setTimeout(() => {
            this.counter++;
          }, 200);
        await sleepAsync(500);
      });
    }

    @Entrypoint()
    run2() {
      return this.entrypoint(async () => {
        getCurrentScope()
          .feature(TimerFeature)
          .setTimeout(() => {
            this.counter++;
          }, 500);
        await sleepAsync(200);
      });
    }

    @Entrypoint()
    run3() {
      return this.entrypoint(async () => {
        getCurrentScope()
          .feature(TimerFeature)
          .setInterval(() => {
            this.counter++;
          }, 100);
        await sleepAsync(500);
      });
    }
  }

  test("Should create a timeout", async () => {
    const robot = new TestRobot();
    const run = robot.run1();
    run.start().then();

    expect(robot.counter).toEqual(0);
    await sleepAsync(200);
    expect(robot.counter).toEqual(1);
  });

  test("Should remove timeout if scope exits", async () => {
    const robot = new TestRobot();
    const run = robot.run2();
    run.start().then(() => {
      console.log("Done");
    });

    expect(robot.counter).toEqual(0);
    await sleepAsync(300);
    expect(robot.counter).toEqual(0);
    await sleepAsync(1_000);
    expect(robot.counter).toEqual(0);
  });

  test("Should create interval and remove it on scope exit", async () => {
    const robot = new TestRobot();
    const run = robot.run3();
    run.start().then(() => {
      console.log("Done");
    });

    expect(robot.counter).toEqual(0);
    await sleepAsync(100);
    expect(robot.counter).toEqual(1);
    await sleepAsync(100);
    expect(robot.counter).toEqual(2);
    await sleepAsync(100);
    expect(robot.counter).toEqual(3);
    await sleepAsync(100);
    expect(robot.counter).toEqual(4);
    await sleepAsync(100);
    expect(robot.counter).toEqual(4);
  });
});
