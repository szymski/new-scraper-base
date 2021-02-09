import async from "async";
import { ProgressTracker } from "./progress-tracker";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";

const ScopeProgressDataKey = Symbol("ScopeProgress");
const ParallelIndexDataKey = Symbol("ParallelIndex");

export interface ScopeProgress {
  parent?: ScopeProgress;
  tracker: ProgressTracker;
  children: ScopeProgress[];
}

export class Parallel {
  #name?: string;
  #index: number;
  #taskLimit = 1;

  constructor(index: number, name?: string) {
    this.#name = name;
    this.#index = index;
  }

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

  static getRootProgress(scope: ScopeContext) {
    return scope.root.get<ScopeProgress>(ScopeProgressDataKey);
  }

  static getAndIncreaseIndex(scope: ScopeContext): number {
    const number = scope.get<number>(ParallelIndexDataKey) ?? 0;
    scope.setLocal(ParallelIndexDataKey, number + 1);
    return number;
  }

  private static assignProgress(scope: ScopeContext, tracker: ProgressTracker) {
    const currentTracker = scope.get<ScopeProgress>(ScopeProgressDataKey);

    const newProgress: ScopeProgress = {
      parent: currentTracker,
      tracker,
      children: [],
    };

    if (currentTracker) {
      currentTracker.children.push(newProgress);
    }

    scope.set(ScopeProgressDataKey, newProgress);
  }

  private static finalizeProgress(scope: ScopeContext) {
    const currentTracker = scope.get<ScopeProgress>(ScopeProgressDataKey);

    if (currentTracker?.parent) {
      currentTracker.parent.children = currentTracker.parent.children.filter(
        (progress) => progress !== currentTracker
      );
    }

    scope.set(ScopeProgressDataKey, currentTracker?.parent);
  }
}

export function parallel(name?: string) {
  const index = Parallel.getAndIncreaseIndex(getCurrentScope());
  return new Parallel(index, name);
}
