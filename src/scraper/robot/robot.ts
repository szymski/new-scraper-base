import { RobotRun } from "./robot-run";
import { getCurrentScope } from "./scope";
import { DataFeature } from "./feature/features";

export class Robot {
  entrypoint<TData, TReturn = any>(
    fn: () => Promise<TReturn>
  ): RobotRun<TData, TReturn> {
    return new RobotRun<TData, TReturn>(this, fn);
  }

  protected onDataReceived(type: string, data: any) {
    getCurrentScope().feature(DataFeature).reportData(type, data);
  }
}
