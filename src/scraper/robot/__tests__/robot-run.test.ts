import { AbortedException } from "../../exceptions";
import { Entrypoint } from "../entrypoint";
import { Robot } from "../robot";
import { Feature } from "../feature";
import { getCurrentScope, Scope } from "../scope";
import { RootScopeContext } from "../scope/root-scope-context";
import { ScopeContext } from "../scope/scope-context";
import { sleepAsync } from "../test-helpers";

describe("Robot run tests", () => {
  class TestRobot extends Robot {
    @Entrypoint()
    run1() {
      return this.entrypoint(async () => {});
    }
  }

  test("Should properly initialize robot run", () => {
    const robot = new TestRobot();
    const run = robot.run1();

    expect(run.status).toEqual("initial");
    expect(run.rootScope.name).toEqual("run1");
    expect(run.rootScope.robot).toBe(robot);
  });

  test("Should return and cache feature properties", () => {
    class TestFeature extends Feature {
      variable = this.createInitialVariable<number>("Initial");
    }

    const robot = new TestRobot();
    const run = robot.run1();

    const props1 = run.feature(TestFeature);
    const props2 = run.feature(TestFeature);
    expect(props1).toBe(props2);

    props1.variables.variable = 123;
    expect(
      run.rootScope.getFeatureConfiguration(TestFeature).getVariable("Initial")
    ).toEqual(123);
  });

  describe("Execution", () => {
    jest.useFakeTimers();

    describe("Starting", () => {
      class ExecRobot extends Robot {
        @Entrypoint()
        runAndWait() {
          return this.entrypoint(async () => {
            await sleepAsync(1_000);
          });
        }

        @Entrypoint()
        runAndError() {
          return this.entrypoint(async () => {
            await sleepAsync(1_000);
            throw new Error("I errored!");
          });
        }

        @Entrypoint()
        runAndReturn() {
          return this.entrypoint(async () => {
            await sleepAsync(1_000);
            return 123;
          });
        }
      }

      test("Should throw on start attempt if already running", async () => {
        const robot = new ExecRobot();
        const run = robot.runAndWait();

        run.start().then();

        await expect(async () => run.start()).rejects.toThrowError(Error);
      });

      test("Should return value returned by entrypoint", async () => {
        const robot = new ExecRobot();
        const run = robot.runAndReturn();

        const promise = run.start();
        jest.advanceTimersByTime(1_000);
        await expect(promise).resolves.toEqual(123);
      });

      test("Should update statuses on successful run", async () => {
        const robot = new ExecRobot();
        const run = robot.runAndWait();

        expect(run.status).toEqual("initial");

        const promise = run.start();

        expect(run.status).toEqual("running");

        jest.advanceTimersByTime(1_000);
        await promise;
        expect(run.status).toEqual("finished");
      });

      test("Should set status to errored on error", async () => {
        const robot = new ExecRobot();
        const run = robot.runAndError();

        expect(run.status).toEqual("initial");

        const promise = run.start();

        expect(run.status).toEqual("running");

        jest.advanceTimersByTime(1_000);
        await expect(promise).rejects.toThrowError("I errored!");
        expect(run.status).toEqual("errored");
      });
    });

    describe("Cancelling", () => {
      test("Should wait for main scope to finish when cancelling", async () => {
        // Fake timers did not work well here. They got stuck for some reason.
        jest.useRealTimers();

        class CancelTestRobot extends Robot {
          counter = 0;

          @Entrypoint()
          run() {
            return this.entrypoint(async () => {
              await this.scope1();
            });
          }

          @Scope()
          async scope1() {
            this.counter = 1;
            console.log(this.counter);
            await sleepAsync(500);
            this.counter = 2;
            console.log(this.counter);
            await sleepAsync(500);
            this.counter = 3;
            console.log(this.counter);
          }
        }

        const robot = new CancelTestRobot();
        const run = robot.run();

        run.start().then();

        expect(run.status).toEqual("running");
        expect(robot.counter).toEqual(1);

        const cancelPromise = run
          .cancel()
          .then((success) => [success, robot.counter]);

        expect(run.status).toEqual("cancelling");
        await expect(cancelPromise).resolves.toEqual([true, 3]);
        expect(run.status).toEqual("cancelled");
      });

      test("Should cancel using abort controller", async () => {
        // Fake timers did not work well here. They got stuck for some reason.
        jest.useRealTimers();

        class CancelTestRobot extends Robot {
          @Entrypoint()
          run() {
            return this.entrypoint(async () => {
              await this.scope1();
            });
          }

          @Scope()
          async scope1() {
            let i = 0;
            while (true) {
              console.log(i++);
              await sleepAsync(500);

              if (getCurrentScope().root.abortController.signal.aborted) {
                throw new AbortedException();
              }
            }
          }
        }

        const robot = new CancelTestRobot();
        const run = robot.run();

        const startPromise = run.start();

        await sleepAsync(1_000);

        const cancelPromise = run.cancel();

        expect(run.rootScope.abortController.signal.aborted).toBeTruthy();

        await expect(cancelPromise).resolves.toBeTruthy();
        await expect(startPromise).rejects.toThrowError(AbortedException);
      });

      test("Should timeout when cancelling takes too long", async () => {
        jest.useRealTimers();

        class CancelTestRobot extends Robot {
          exited = false;

          @Entrypoint()
          run() {
            return this.entrypoint(async () => {
              await this.scope1();
            });
          }

          @Scope()
          async scope1() {
            console.log("Enter");
            await sleepAsync(2_000);
            console.log("Exit");
            this.exited = false;
          }
        }

        const robot = new CancelTestRobot();
        const run = robot.run();

        const startPromise = run.start();

        const cancelPromise = run.cancel(1_000);

        await expect(cancelPromise).resolves.toBeFalsy();
        expect(robot.exited).toBeFalsy();
      });

      test("Should cancel immediately", async () => {
        jest.useRealTimers();

        class CancelTestRobot extends Robot {
          exited = false;

          @Entrypoint()
          run() {
            return this.entrypoint(async () => {
              await this.scope1();
            });
          }

          @Scope()
          async scope1() {
            console.log("Enter");
            await sleepAsync(2_000);
            console.log("Exit");
            this.exited = false;
          }
        }

        const robot = new CancelTestRobot();
        const run = robot.run();

        const startPromise = run.start();

        const cancelPromise = run.cancel(0);

        await expect(cancelPromise).resolves.toBeTruthy();
        expect(robot.exited).toBeFalsy();
      });
    });
  });

  describe("Callbacks", () => {
    test("Should call scope enter/exit callbacks", async () => {
      class TestFeature extends Feature {
        onRootScopeEnter(scope: RootScopeContext) {
          super.onRootScopeEnter(scope);
        }

        onScopeEnter(scope: ScopeContext) {
          super.onScopeEnter(scope);
        }

        onScopeExit(scope: ScopeContext) {
          super.onScopeExit(scope);
          console.log(`Exited ${scope.fullExecutionName}`);
        }
      }

      class ExecRobot extends Robot {
        @Entrypoint()
        runIt() {
          return this.entrypoint(async () => {
            await this.scope1();
          });
        }

        @Scope()
        async scope1() {
          await this.scope2();
        }

        @Scope()
        async scope2() {}
      }

      const robot = new ExecRobot();
      const run = robot.runIt();
      run.feature(TestFeature); // Bootstrap feature

      const feature = Feature.getInstance(TestFeature);
      const rootScopeEntrySpy = jest.spyOn(feature, "onRootScopeEnter");
      const scopeEnterSpy = jest.spyOn(feature, "onScopeEnter");
      const scopeExitSpy = jest.spyOn(feature, "onScopeExit");

      await run.start();

      expect(rootScopeEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "runIt",
        })
      );

      expect(scopeEnterSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: "scope1",
        })
      );

      expect(scopeEnterSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: "scope2",
        })
      );

      expect(scopeExitSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: "scope2",
        })
      );

      expect(scopeExitSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: "scope1",
        })
      );

      expect(scopeExitSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          name: "runIt",
        })
      );
    });

    test("Should call scope error callbacks", async () => {
      class TestFeature extends Feature {
        onScopeError(scope: ScopeContext, source: ScopeContext, error: Error) {}
      }

      class ExecRobot extends Robot {
        @Entrypoint()
        runIt() {
          return this.entrypoint(async () => {
            await this.scope1();
          });
        }

        @Scope()
        async scope1() {
          await this.scope2();
        }

        @Scope()
        async scope2() {
          throw new Error("Scope2 error");
        }
      }

      const robot = new ExecRobot();
      const run = robot.runIt();
      run.feature(TestFeature); // Bootstrap feature

      const feature = Feature.getInstance(TestFeature);
      const errorSpy = jest.spyOn(feature, "onScopeError");

      await expect(run.start()).rejects.toThrowError("Scope2 error");

      expect(errorSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: "scope2" }),
        expect.objectContaining({ name: "scope2" }),
        expect.objectContaining({ message: "Scope2 error" })
      );

      expect(errorSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: "scope1" }),
        expect.objectContaining({ name: "scope2" }),
        expect.objectContaining({ message: "Scope2 error" })
      );

      expect(errorSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ name: "runIt" }),
        expect.objectContaining({ name: "scope2" }),
        expect.objectContaining({ message: "Scope2 error" })
      );
    });
  });
});
