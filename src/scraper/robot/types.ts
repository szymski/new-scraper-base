// TODO: Use better names and document this

type OutputType<TName, TData> = {
  type: TName;
  data: TData;
};

type TemporaryOutputMap<TDataMap> = {
  [K in keyof TDataMap as K]: OutputType<K, TDataMap[K]>;
};

export type RobotOutputData<
  TDataMap
> = TemporaryOutputMap<TDataMap>[keyof TDataMap];
