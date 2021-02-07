import { Logger } from "../util/logger";
import {
  getCurrentScope,
  RootScopeContext,
  runWithInitialScope,
  ScopeContext,
} from "./scope";

interface RobotRun<TData, TReturn> {
  callbacks: {
    onDataReceived(output: OutputTypeUnion<TData>): void;
  };

  start(): Promise<TReturn>;
}

////////////////////

type OutputType<TName, TData> = {
  type: TName;
  data: TData;
};

type TemporaryOutputMap<TDataMap> = {
  [K in keyof TDataMap as K]: OutputType<K, TDataMap[K]>;
};

type OutputTypeUnion<TDataMap> = TemporaryOutputMap<TDataMap>[keyof TDataMap];

export class Robot {
  onScopeStart(scope: ScopeContext) {}

  onScopeEnd(scope: ScopeContext) {}

  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    let run: RobotRun<TData, TReturn>;

    Logger.verbose(`Initialized entrypoint`);

    const scope: Partial<RootScopeContext> = {
      // TODO: Get name from entrypoint name
      robot: this,
      callbacks: {
        onDataReceived(type: string, data: any) {
          run.callbacks.onDataReceived({
            type,
            data,
          } as OutputTypeUnion<TData>);
        },
      },
    };

    const start = async () => {
      Logger.verbose("Running entrypoint");
      const result = await runWithInitialScope(fn, scope);
      Logger.verbose("Robot action finished");
      return result;
    };

    run = {
      start,
      callbacks: {
        onDataReceived(data: OutputTypeUnion<TData>) {},
      },
    };

    return run;
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().root.callbacks.onDataReceived(type, data);
  }
}

export function Entrypoint(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {};
}
