import { DataFeature } from "./feature/features";
import { RobotRun } from "./robot-run";
import { getCurrentScope } from "./scope";

export class Robot {
  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    return new RobotRun<TData, TReturn>(this, fn);
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().feature(DataFeature).reportData(type, data);
  }

  /// Experimental feature
  readonly _: {
    [K in keyof this]: this[K] extends (...args: infer Args) => infer Ret
      ? (...args: Partial<Args>) => Ret
      : never;
  } = this as any;
}
