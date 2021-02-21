// import {
//   getMethodInjectedParams,
//   InjectA,
// } from "../../../util/parameter-injector";
// import { RootScopeContext } from "../../scope/root-scope-context";
// import { ScopeContext } from "../../scope/scope-context";
// import { FeatureConfiguration } from "../configuration";
// import { Feature } from "../feature-class";
//
// describe("Parameter injector tests", () => {
//   test("Test", () => {
//     class A {
//       func(@InjectA() asd: string) {}
//     }
//
//     console.log(getMethodInjectedParams(A.prototype, "func"));
//   });
// });
//
// class Feat extends Feature {
//   method(
//     @Scope() scope: ScopeContext,
//     @RootScope() root: RootScopeContext,
//     a: number,
//     b: number
//   ) {}
//
//   init_test(@Config() config: FeatureConfiguration, a: string) {}
// }
//
// type ExcludeInjectableTypes<T extends unknown[]> = T extends [...infer Params, infer A]
//   // @ts-ignore Type instantiation is excessively deep and possibly infinite.(2589) - This problem is not present in TS 4.2
//   ? [...ExcludeInjectableTypes<Params>, ...(A extends ScopeContext ? [] : (T extends [...Params, ...infer R] ? R : []))]
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
//
// // Scope usage
// scope.feature(Feat).method(2, 3);
//
// // Init usage
// run.feature(Feat).test("asd");
