import { createEntrypointRun } from "./entrypoint";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";
import { RobotRun } from "./types";
import { DataFeature } from "./feature/features/data";

export class Robot {
  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    return createEntrypointRun<TData, TReturn>(this, fn);
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().feature(DataFeature).reportData(type, data);
  }
}
