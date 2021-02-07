export interface RobotRun<TData, TReturn> {
  callbacks: {
    onDataReceived(output: OutputTypeUnion<TData>): void;
  };

  start(): Promise<TReturn>;
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
