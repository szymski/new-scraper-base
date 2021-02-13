import { Entrypoint, Robot } from "../scraper/robot";
import { ProgressFeature } from "../scraper/robot/feature/progress";
import { ProgressTracker } from "../scraper/robot/progress-tracker";
import { getCurrentScope, Scope } from "../scraper/robot/scope";
import { Logger } from "../scraper/util/logger";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

class TestRobot extends Robot {
  @Entrypoint()
  entry() {
    return this.entrypoint<{}>(async () => {
      await this.example();
    });
  }

  // @Scope()
  // async exampleNoFeature() {
  //   const count = 30;
  //
  //   const tracker = new ProgressTracker({
  //     start: 0,
  //     max: count,
  //   });
  //   console.log(ProgressTracker.renderProgressbar(tracker));
  //
  //   for (let i = 0; i < count; i++) {
  //     await sleep(100);
  //     tracker.increase();
  //     console.log(ProgressTracker.renderProgressbar(tracker));
  //   }
  // }

  @Scope()
  async example() {
    const scope = getCurrentScope();

    const count = 30;

    const feature = scope.feature(ProgressFeature);
    const tracker = feature.create({
      start: 0,
      max: count,
    });
    console.log(ProgressTracker.renderProgressbar(tracker));

    for (let i = 0; i < count; i++) {
      await sleep(100);
      tracker.increase();
      console.log(ProgressTracker.renderProgressbar(tracker));
    }
  }
}

const robot = new TestRobot();

const run = robot.entry();

run.feature(ProgressFeature).callbacks.onProgress = (tracker, scope) => {
  Logger.error(scope);
  Logger.warn(`Received feature callback with progress!`);
  Logger.warn(ProgressTracker.renderProgressbar(tracker));
};

run.start().then();
