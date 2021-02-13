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
      onUpdate: (tracker) => this.onProgress.invoke(tracker),
    });
  }

  onProgress = this.createCallback<(tracker: ProgressTracker) => void>();
}
