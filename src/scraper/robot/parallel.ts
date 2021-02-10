import async from "async";
import { Logger } from "../util/logger";
import { ProgressTracker } from "./progress-tracker";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";

const ScopeProgressDataKey = Symbol("ScopeProgress");
const ParallelIndexDataKey = Symbol("ParallelIndex");
const ParallelCheckpointsRootDataKey = Symbol("ParallelCheckpointsRoot");
const CheckpointUniqueIdDataKey = Symbol("CheckpointUniqueId");

interface ParallelCheckpoints {
  checkpoints: { [uniqueId: string]: ParallelCheckpoint };
}

interface ParallelCheckpoint {
  finished: boolean;
}

export interface ScopeProgress {
  parent?: ScopeProgress;
  tracker: ProgressTracker;
  children: ScopeProgress[];
}

export class Parallel {
  #name?: string;
  #index: number;
  #uniqueId: string;

  #taskLimit = 1;

  constructor(name?: string) {
    this.#name = name;

    const scope = getCurrentScope();
    const index = Parallel.getAndIncreaseIndex(scope);
    this.#index = index;

    let parentKey: string | undefined;
    if(scope.parent) {
      parentKey = scope.parent.get<string>(CheckpointUniqueIdDataKey);
    }
    this.#uniqueId = `${parentKey ? `${parentKey}.` : ""}${scope.name}[${index}]`;
    scope.set(CheckpointUniqueIdDataKey, this.#uniqueId);
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

    const originalId = this.#uniqueId;

    await async
      .eachLimit(elements, this.#taskLimit, async (item) => {
        scope.set(CheckpointUniqueIdDataKey, `${originalId}[${JSON.stringify(item)}]`);
        await fn(item);
        scope.set(CheckpointUniqueIdDataKey, originalId);
        tracker.increase();
        Parallel.markCheckpointAsFinished(
          scope,
          `${this.#uniqueId}[${JSON.stringify(item)}]`
        );
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

    const originalId = this.#uniqueId;

    await async
      .timesLimit(end - start, this.#taskLimit, async (n) => {
        scope.set(CheckpointUniqueIdDataKey, `${originalId}[${n}]`);
        await fn(start + n);
        scope.set(CheckpointUniqueIdDataKey, originalId);
        tracker.increase();
        Parallel.markCheckpointAsFinished(scope, `${this.#uniqueId}[${n}]`);
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

  static getRootCheckpoints(scope: ScopeContext) {
    let checkpoints = scope.get<ParallelCheckpoints>(
      ParallelCheckpointsRootDataKey
    );
    if (!checkpoints) {
      checkpoints = {
        checkpoints: {},
      };
      scope.root.set(ParallelCheckpointsRootDataKey, checkpoints);
    }
    return checkpoints;
  }

  private static markCheckpointAsFinished(
    scope: ScopeContext,
    uniqueId: string
  ) {
    const checkpoints = Parallel.getRootCheckpoints(scope);
    let checkpoint = checkpoints.checkpoints[uniqueId];
    if (!checkpoint) {
      checkpoint = {
        finished: true,
      };
      checkpoints.checkpoints[uniqueId] = checkpoint;
    }

    Logger.warn(`Removing: ${uniqueId}`);
    // Clear child checkpoints
    const keysToDelete = Object.keys(checkpoints.checkpoints).filter(
      (key) => key.startsWith(uniqueId) && key != uniqueId
    );
    for (const key of keysToDelete) {
      delete checkpoints.checkpoints[key];
    }
  }

  static restoreCheckpoints(
    scope: ScopeContext,
    checkpoints: ParallelCheckpoints
  ) {
    Logger.verbose(`Restoring checkpoints`);
    scope.set(ParallelCheckpointsRootDataKey, checkpoints);
  }
}

export function parallel(name?: string) {
  return new Parallel(name);
}
