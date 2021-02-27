import {
  getMethodInjectedParams,
  InjectParam,
  invokeAndInjectParams,
} from "../parameter-injector";

describe("Parameter injector tests", () => {
  function InjectA(): ParameterDecorator {
    return InjectParam("param-a");
  }

  function InjectB(): ParameterDecorator {
    return InjectParam("param-b");
  }

  test("Should get info about injected params", () => {
    class A {
      func(
        @InjectA() asd: string,
        nonInjected: boolean,
        @InjectB() asdf: number
      ) {}
    }

    const injectedParams = getMethodInjectedParams(A.prototype, "func");

    expect(injectedParams).toEqual(
      expect.arrayContaining([
        { type: "param-a", index: 0 },
        { type: "param-b", index: 2 },
      ])
    );
  });

  describe("Function invocation", () => {
    class A {
      field = 123;

      func(@InjectA() a: number) {
        return [...arguments];
      }

      func2(
        param1: number,
        @InjectA() param2: number,
        @InjectB() param3: string,
        param4: string
      ) {
        return [...arguments];
      }

      func3(@InjectB() b: string) {
        return [this.field, b];
      }
    }

    const a = new A();

    test("Should inject undefined if parameter not provided", () => {
      const result = invokeAndInjectParams(a, "func", {}, []);
      expect(result).toEqual([undefined]);
    });

    test("Should inject parameter if provided", () => {
      const result = invokeAndInjectParams(
        a,
        "func",
        {
          "param-a": 123,
        },
        []
      );
      expect(result).toEqual([123]);
    });

    test("Should inject multiple parameters and preserve other params", () => {
      const result = invokeAndInjectParams(
        a,
        "func2",
        {
          "param-a": 123,
          "param-b": "injected",
        },
        [1, undefined, "should be ignored", "test"]
      );
      expect(result).toEqual([1, 123, "injected", "test"]);
    });

    test("Should preserve this", () => {
      a.field = 321;
      const result = invokeAndInjectParams(
        a,
        "func3",
        {
          "param-b": "injected",
        },
        []
      );
      expect(result).toEqual([321, "injected"]);
    });

    test("Should do lazy initialization of a parameter", () => {
      const initializer = jest.fn(() => 5);

      const result = invokeAndInjectParams(
        a,
        "func",
        {
          "param-a": initializer,
        },
        []
      );

      expect(result).toEqual([5]);
      expect(initializer).toBeCalledTimes(1);
    });

    test("Should skip lazy initialization of a parameter if it's not present", () => {
      const initializer = jest.fn(() => 5);

      const result = invokeAndInjectParams(
        a,
        "func",
        {
          "param-a": 10,
          "param-b": initializer,
        },
        []
      );

      expect(result).toEqual([10]);
      expect(initializer).toBeCalledTimes(0);
    });
  });
});

//// Code related to function parameter exclusion for feature classes
//
// function RootScope() {}
//
// function Config() {}
//
// class Feat extends Feature {
//   method(
//     @InjectA() scope: ScopeContext,
//     @InjectA() root: RootScopeContext,
//     a: number,
//     b: number
//   ) {}
//
//   init_test(@InjectA() config: FeatureConfiguration, a: string) {}
// }
//
// type ExcludeInjectableTypes<T extends unknown[]> = T extends [
//   ...infer Params,
//   infer A
// ]
//   ? [
//       ...ExcludeInjectableTypes<Params>,
//       ...(A extends ScopeContext
//         ? []
//         : T extends [...Params, ...infer R]
//         ? R
//         : [])
//     ]
//   : T;
//
// type FunctionWithoutInjectable<T> = T extends (
//   ...params: infer Params
// ) => infer Return
//   ? (...params: Params) => Return
//   : never;
//
// type B = ExcludeInjectableTypes<
//   [param1: string, param2: ScopeContext, param3: number]
// >;
// type A = FunctionWithoutInjectable<Feat["method"]>;

// // Scope usage
// scope.feature(Feat).method(2, 3);
// //
// // // Init usage
// // run.feature(Feat).test("asd");
