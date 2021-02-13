import {
  ProgressTracker,
  ProgressTrackerOptions,
} from "../../progress-tracker";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class ProgressFeature extends Feature {
  create(
    scope: ScopeContext,
    options: ProgressTrackerOptions
  ): ProgressTracker {
    return new ProgressTracker({
      ...options,
      name: `${options.name || "progress"}[${this.progressId.value!++}]`,
      onUpdate: (tracker) => this.onProgress.invoke(tracker),
    });
  }

  // TODO: Readonly modifier won't work
  onProgress = this.createCallback<(tracker: ProgressTracker) => void>();

  progressId = this.createLocalScopeVariable<number>("ProgressId", () => 0);
}
