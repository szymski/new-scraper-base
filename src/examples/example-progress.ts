/**
 * @file Progress tracker example.
 * This example shows what {@link Feature} class is capable of and how it is used.
 * Here we use a simple progress tracking feature - {@link ProgressFeature}.
 * Feature class allows to separate specific functionalities from others,
 * so it is possible to add new callbacks/parameters without cluttering up core interfaces.
 *
 * {@link ProgressFeature} class contains one method and one field:
 * - {@link ProgressFeature.create} is a simple method which creates a new {@link ProgressTracker}
 *  and connects it to {@link ProgressFeature.onProgress} callback descriptor.
 * - {@link ProgressFeature.onProgress} is a {@link FeatureCallbackDescriptor} which is a definition
 *  of a callback that we can later connect ourselves to, in order to receive scraping progress updates.
 *
 *  {@link ScopeContext.feature} allows us to get {@link FeatureContext} of a given feature.
 *  {@link FeatureContext} is used to access feature-related methods and data.
 *  New {@link FeatureContext} instance is created on each entrypoint.
 */

import { Entrypoint, Robot } from "../scraper/robot";
import { ProgressFeature } from "../scraper/robot/feature/progress";
import { ProgressTracker } from "../scraper/robot/progress-tracker";
import { getCurrentScope, Scope } from "../scraper/robot/scope";
import { Logger } from "../scraper/util/logger";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

class ProgressExampleRobot extends Robot {
  @Entrypoint()
  entry() {
    return this.entrypoint<{}>(async () => {
      await this.example();
    });
  }

  @Scope()
  async example() {
    const scope = getCurrentScope();

    const count = 30;

    // Here we grab context of a feature, for this we pass the feature's class constructor
    const feature = scope.feature(ProgressFeature);

    // We call progress feature's method to create a tracker
    // ProgressFeature's onProgress callback is invoked here
    const tracker = feature.create({
      start: 0,
      max: count,
    });

    for (let i = 0; i < count; i++) {
      await sleep(100);
      // We increase progress, which invokes onProgress callback
      tracker.increase();
    }
  }
}

const robot = new ProgressExampleRobot();

const run = robot.entry();

// We get run properties of a feature and assign a callback to it
// Callback invocation source (current scope) is always passed as the last parameter
run.feature(ProgressFeature).callbacks.onProgress = (tracker, scope) => {
  Logger.warn(ProgressTracker.renderProgressbar(tracker));
};

run.start().then();
