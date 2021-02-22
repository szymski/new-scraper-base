import { Logger } from "../util/logger";
import { RobotRun } from "./robot-run";

export abstract class Process {
  static runs = new Set<RobotRun<any, any>>();

  private static exiting = false;

  static registerRobotRun(run: RobotRun<any, any>) {
    this.runs.add(run);
  }

  static unregisterRobotRun(run: RobotRun<any, any>) {
    this.runs.delete(run);
  }

  static enableInterrupt() {
    process.on("SIGINT", this.onInterrupt);
  }

  static disableInterrupt() {
    process.removeListener("SIGINT", this.onInterrupt);
  }

  private static onInterrupt = () => {
    if (Process.exiting) {
      return;
    }

    Process.exiting = true;

    Logger.warn(
      `Received interrupt, cancelling robot runs (${Process.runs.size})...`
    );

    Process.disableInterrupt();

    Promise.all([...Process.runs.values()].map((run) => run.cancel())).then(
      () => {
        Logger.warn("Runs cancelled, exiting...");
        process.exit();
      }
    );
  };
}

Process.enableInterrupt();
