import { getCurrentScope, Scope, ScopeParam } from "../scope";
import { runWithInitialScope, wrapWithScope } from "../scope/helpers";

describe("Scope tests", () => {
  const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

  test("Should throw exception on get scope attempt outside of a scope", () => {
    expect(() => getCurrentScope()).toThrow(Error);
  });

  test("Should return proper scopes in nested function calls", async () => {
    const scopeNames: string[] = [];

    const C = wrapWithScope(async () => {
      scopeNames.push(getCurrentScope().fullName);
    }, "C");
    const B = wrapWithScope(async () => {
      scopeNames.push(getCurrentScope().fullName);
      await C();
      scopeNames.push(getCurrentScope().fullName);
    }, "B");
    const A = wrapWithScope(async () => {
      scopeNames.push(getCurrentScope().fullName);
      await B();
    }, "A");

    await runWithInitialScope(
      async () => {
        await A();

        expect(scopeNames).toEqual([
          "ROOT.A",
          "ROOT.A.B",
          "ROOT.A.B.C",
          "ROOT.A.B",
        ]);
      },
      {
        fullName: "ROOT",
      }
    );
  });

  test("Should return proper scopes in a race condition", async () => {
    const scopeNames: string[] = [];

    const F1 = wrapWithScope(async () => {
      scopeNames.push(getCurrentScope().fullName);
      await nextTick();
      await nextTick();
      scopeNames.push(getCurrentScope().fullName);
    }, "F1");

    const F2 = wrapWithScope(async () => {
      scopeNames.push(getCurrentScope().fullName);
      await nextTick();
      scopeNames.push(getCurrentScope().fullName);
    }, "F2");

    const F3 = wrapWithScope(async () => {
      await nextTick();
      await F2();
    }, "F3");

    await runWithInitialScope(
      async () => {
        await Promise.all([F1(), F2(), F3()]);

        expect(scopeNames).toEqual([
          "ROOT.F1",
          "ROOT.F2",
          "ROOT.F2",
          "ROOT.F3.F2",
          "ROOT.F1",
          "ROOT.F3.F2",
        ]);
      },
      {
        fullName: "ROOT",
      }
    );
  });

  test("Should format execution name using parameters", async () => {
    const scopeNames: string[] = [];

    class Robot {
      @Scope()
      async fn(
        @ScopeParam("param1") param1: number,
        @ScopeParam("param2") param2: string
      ) {
        scopeNames.push(getCurrentScope().fullExecutionName);
      }
    }

    const robot = new Robot();

    await runWithInitialScope(
      async () => {
        await robot.fn(123, "str");
        expect(scopeNames).toEqual([`ROOT.fn(param1=123,param2="str")`]);
      },
      {
        fullName: "ROOT",
      }
    );
  });
});
