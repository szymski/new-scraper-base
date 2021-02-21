import { Entrypoint } from "../entrypoint";
import { Feature } from "../feature";
import { Robot } from "../robot";
import { Scope } from "../scope";
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

  describe("Execution starting/cancelling", () => {
    jest.useFakeTimers();

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
