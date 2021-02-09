import async from "async";
import { ProgressTracker } from "./progress-tracker";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/types";

const ScopeProgressDataKey = "ScopeProgress";

export interface ScopeProgress {
  parent?: ScopeProgress;
  tracker: ProgressTracker;
  children: ScopeProgress[];
}

export class Parallel {
  #taskLimit = 1;

  /**
   * Sets the number of max concurrent executions of a task.
   * @param limit
   */
  setLimit(limit: number): this {
    if (limit < 1) {
      throw new Error("Task limit cannot be lower than 1");
    }
    this.#taskLimit = limit;
    return this;
  }

  /**
   * Parallelize actions performed for each array element.
   * @param elements Sequence of elements
   * @param fn Function to run for each element
   */
  async forEach<T>(elements: T[], fn: (element: T) => void) {
    const scope = getCurrentScope();
    const tracker = new ProgressTracker({
      name: scope.executionName,
      start: 0,
      max: elements.length,
    });

    Parallel.assignProgress(scope, tracker);

    await async
      .eachLimit(elements, this.#taskLimit, async (item) => {
        await fn(item);
        tracker.increase();
      })
      .finally(() => {
        tracker.finish();
        Parallel.finalizeProgress(scope);
      });
  }

  /**
   * Parallelize actions performed in a for loop.
   * @param elements Sequence of elements
   * @param fn Function to run for each element
   * @param start First value
   * @param end Last value, exclusively
   */
  async for<T>(start: number, end: number, fn: (i: number) => void) {
    const scope = getCurrentScope();
    const tracker = new ProgressTracker({
      name: scope.executionName,
      start: start,
      max: end,
    });

    Parallel.assignProgress(scope, tracker);

    await async
      .timesLimit(end - start, this.#taskLimit, async (n) => {
        await fn(start + n);
        tracker.increase();
      })
      .finally(() => {
        tracker.finish();
        Parallel.finalizeProgress(scope);
      });
  }

  // /**
  //  * Parallelize actions performed in a for loop, without known sequence length.
  //  * The callback should return a boolean value which indicates if execution should be continued.
  //  * @param elements Sequence of elements
  //  * @param fn Function to run for each element
  //  */
  // async while<T>(start: number, end: number, fn: (i: number) => boolean) {
  //   const scope = getCurrentScope();
  //   const bar = Parallel.createBar(end - start, scope.executionName);
  //   for (let i = start; ; i++) {
  //     const shouldContinue = await fn(i);
  //     // bar.tick();
  //     if (!shouldContinue) {
  //       break;
  //     }
  //   }
  //   bar.terminate();
  // }

  static getRootProgress(scope: ScopeContext): ScopeProgress | undefined {
    return scope.root.data[ScopeProgressDataKey];
  }

  private static assignProgress(scope: ScopeContext, tracker: ProgressTracker) {
    const currentTracker: ScopeProgress | undefined =
      scope.data[ScopeProgressDataKey];

    const newProgress: ScopeProgress = {
      parent: currentTracker,
      tracker,
      children: [],
    };

    if (currentTracker) {
      currentTracker.children.push(newProgress);
    }

    scope.data[ScopeProgressDataKey] = newProgress;
  }

  private static finalizeProgress(scope: ScopeContext) {
    const currentTracker: ScopeProgress | undefined =
      scope.data[ScopeProgressDataKey];

    if (currentTracker?.parent) {
      currentTracker.parent.children = currentTracker.parent.children.filter(
        (progress) => progress !== currentTracker
      );
    }

    scope.data[ScopeProgressDataKey] = currentTracker?.parent;
  }
}

export function parallel() {
  return new Parallel();
}
