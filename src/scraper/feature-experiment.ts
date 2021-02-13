// interface ScopeVariable<T> {
//
// }
//
// abstract class Feature {
//   abstract localScopeVariable<T>(key: symbol | string): ScopeVariable<T>;
// }
//
// abstract class ParallelFeature extends Feature {
//   static DATA_KEYS = {
//     ScopeProgress: Symbol("ScopeProgress"),
//     ParallelIndex: Symbol("ParallelIndex"),
//     ParallelCheckpointsRoot: Symbol("ParallelCheckpointsRoot"),
//     CheckpointUniqueId: Symbol("CheckpointUniqueId"),
//   } as const;
//
//   readonly uniqueId = this.localScopeVariable<string>(ParallelFeature.DATA_KEYS.CheckpointUniqueId);
// }
//
// //#region Mappers
//
// type FeatureContext<TFeature extends Feature> = {
//   [K in keyof TFeature]: TFeature[K] extends ScopeVariable<infer TVariable> ? TVariable : never;
// };
//
// //#endregion
//
// const context: FeatureContext<ParallelFeature> = null!;
//
// context.uniqueId
//
//
// // Somewhere in the Parallel class
//
// scope.feature(ParallelFeature).uniqueId.set();
