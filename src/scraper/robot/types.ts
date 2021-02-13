import { Feature } from "./feature";
import { FeatureRunProperties } from "./feature/run-properties";
import { RootScopeContext } from "./scope/scope-context";

export type RobotRunStatus = "initial" | "running" | "finished" | "cancelled";

export interface RobotRun<TData, TReturn> {
  status: RobotRunStatus;
  rootScope: RootScopeContext;
  callbacks: {
    onDataReceived(output: OutputTypeUnion<TData>): void;
    onFinished(): void;
    onCancelled(): void;
  };

  start(): Promise<TReturn>;
  cancel(): Promise<void>;

  feature<T extends Feature>(feature: new () => T): FeatureRunProperties<T>;
}

type OutputType<TName, TData> = {
  type: TName;
  data: TData;
};

type TemporaryOutputMap<TDataMap> = {
  [K in keyof TDataMap as K]: OutputType<K, TDataMap[K]>;
};

export type OutputTypeUnion<
  TDataMap
> = TemporaryOutputMap<TDataMap>[keyof TDataMap];
