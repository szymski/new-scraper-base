import { createEntrypointRun } from "./entrypoint";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";
import { RobotRun } from "./types";

export class Robot {
  onScopeStart(scope: ScopeContext) {}

  onScopeEnd(scope: ScopeContext) {}

  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    return createEntrypointRun<TData, TReturn>(this, fn);
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().root.callbacks.onDataReceived(type, data);
  }
}
