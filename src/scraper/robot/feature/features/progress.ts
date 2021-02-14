import {
  ProgressTracker,
  ProgressTrackerOptions,
} from "../../progress-tracker";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

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

  // TODO: Readonly modifier won't work
  onProgress = this.createCallback<(tracker: ProgressTracker) => void>();

  progressId = this.createLocalScopeVariable<number>("ProgressId", () => 0);

  trackerTree = this.createScopeDataTree<ProgressTracker>();
}
