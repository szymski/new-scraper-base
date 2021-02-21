// TypeScript 4.1 won't allow me to do magic with function mapping - I can't ignore parameters of specific type
// on a function. Fortunately TS 4.2 makes it possible, but we have to wait for release.

// import "reflect-metadata";
// import { addMethodMetadata } from "../robot/metadata-helpers";
//
// const INJECTED_PARAMS_KEY = Symbol("InjectedParams");
//
// export type InjectedParamMetadata = [index: number, type: string];
//
// export function InjectA(): ParameterDecorator {
//   return InjectParam("a");
// }
//
// export function InjectParam(type: string): ParameterDecorator {
//   return (target, propertyKey, parameterIndex) => {
//     const metadata = {
//       type,
//       index: parameterIndex,
//     };
//     addMethodMetadata(INJECTED_PARAMS_KEY, target, propertyKey, metadata);
//   };
// }
//
// export function getMethodInjectedParams(
//   target: any,
//   methodName: string
// ): InjectedParamMetadata[] {
//   return Reflect.getOwnMetadata(INJECTED_PARAMS_KEY, target, methodName) ?? [];
// }
