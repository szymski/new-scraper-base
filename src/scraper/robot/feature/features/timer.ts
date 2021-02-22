import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class TimerFeature extends Feature {
  timeouts = this.createLocalScopeVariable<Set<NodeJS.Timeout>>(
    "Timeouts",
    (scope) => new Set()
  );

  /**
   * Creates a timeout which is ignored when current scope exits.
   */
  setTimeout(scope: ScopeContext, fn: () => void, ms: number) {
    const timeout = setTimeout(fn, ms);
    this.timeouts.value!.add(timeout);
    return timeout;
  }

  /**
   * Creates an interval which is ignored when current scope exits.
   */
  setInterval(scope: ScopeContext, fn: () => void, interval: number) {
    const timeout = setInterval(fn, interval);
    this.timeouts.value!.add(timeout);
    return timeout;
  }

  onScopeExit(scope: ScopeContext) {
    this.cleanScopeTimers();
  }

  onScopeError(scope: ScopeContext, source: ScopeContext, error: Error) {
    this.cleanScopeTimers();
  }

  // TODO: Add on run cancelled callbacks and cancel all timers

  private cleanScopeTimers() {
    for (const timeout of this.timeouts.value!.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.value!.clear();
  }
}
