import colors from "colors";
import { Logger } from "../../../util/logger";
import {
  ProgressTracker,
  ProgressTrackerOptions,
} from "../../progress-tracker";
import { RootScopeContext } from "../../scope/root-scope-context";
import { ScopeContext } from "../../scope/scope-context";
import { FeatureConfiguration } from "../configuration";
import { Feature } from "../feature-class";
import { TimerFeature } from "./timer";

export class ProgressFeature extends Feature {
  create(
    scope: ScopeContext,
    options: Omit<ProgressTrackerOptions, "onUpdate">
  ): ProgressTracker {
    let node = this.trackerTree.getLocalNode();
    if (node) {
      throw new Error(
        "There can be only one active progress tracker per scope."
      );
    }

    node = this.trackerTree.createNode();

    const tracker = new ProgressTracker({
      ...options,
      name: `${options.name || "progress"}[${this.progressId.value!++}]`,
      onUpdate: (tracker) => {
        this.onProgress.invoke(tracker);
        if (tracker.finished) {
          this.trackerTree.destroyNode(node!);
        }
      },
    });

    node.data = tracker;

    return tracker;
  }

  onRootScopeEnter(scope: RootScopeContext) {
    scope.feature(TimerFeature).setInterval(() => {
      const rootNode = this.trackerTree.getRootNode();
      Logger.color(
        colors.bold,
        "\n" + ProgressTracker.renderProgressTree(rootNode)
      );
    }, 1_000);
  }

  init_enableLogging(config: FeatureConfiguration) {
    this.enableLogging.setValue(config, true);
  }

  // TODO: Readonly modifier won't work
  onProgress = this.createCallback<(tracker: ProgressTracker) => void>();

  progressId = this.createLocalScopeVariable<number>("ProgressId", () => 0);

  trackerTree = this.createScopeDataTree<ProgressTracker>();

  enableLogging = this.createInitialVariable<boolean>(
    "EnableLogging",
    () => false
  );
}
