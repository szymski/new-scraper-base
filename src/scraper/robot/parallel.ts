import async from "async";
import { Logger } from "../util/logger";
import { ProgressTracker } from "./progress-tracker";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";
import {ProgressFeature} from "./feature/features/progress";

const DATA_KEYS = {
  ParallelIndex: Symbol("ParallelIndex"),
  ParallelCheckpointsRoot: Symbol("ParallelCheckpointsRoot"),
  CheckpointUniqueId: Symbol("CheckpointUniqueId"),
} as const;

interface ParallelCheckpoints {
  checkpoints: { [uniqueId: string]: ParallelCheckpoint };
}

interface ParallelCheckpoint {
  finished: boolean;
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
    if (scope.parent) {
      parentKey = scope.parent.get<string>(DATA_KEYS.CheckpointUniqueId);
    }
    this.#uniqueId = `${parentKey ? `${parentKey}.` : ""}${
      scope.name
    }[${index}]`;
    scope.set(DATA_KEYS.CheckpointUniqueId, this.#uniqueId);
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

    const tracker = scope.feature(ProgressFeature).create({
      name: this.#uniqueId,
      start: 0,
      max: elements.length,
    });

    await async
      .eachLimit(elements, this.#taskLimit, async (item) => {
        await this.wrapElement(item, tracker, async () => await fn(item));
      })
      .finally(() => {
        tracker.finish();
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

    const tracker = scope.feature(ProgressFeature).create({
      name: this.#uniqueId,
      start: start,
      max: end,
    });

    await async
      .timesLimit(end - start, this.#taskLimit, async (n) => {
        await this.wrapElement(n, tracker, async () => await fn(start + n));
      })
      .finally(() => {
        tracker.finish();
      });
  }

  /**
   * Parallelize actions performed in a for loop, without known sequence length.
   * The callback should return a boolean value which indicates if execution should be continued.
   * @param fn Function to run for each element
   */
  async countWhile<T>(start: number, fn: (i: number) => Promise<boolean>) {
    const scope = getCurrentScope();

    const tracker = scope.feature(ProgressFeature).create({
      name: this.#uniqueId,
      start: start,
    });

    // TODO: Implement concurrency for unknown sequence lengths
    try {
      for (let i = start; ; i++) {
        const shouldContinue = await this.wrapElement<boolean>(
          i,
          tracker,
          async () => await fn(i)
        );
        if (!shouldContinue) {
          break;
        }
      }
    } finally {
      tracker.finish();
    }
  }

  static getAndIncreaseIndex(scope: ScopeContext): number {
    const number = scope.get<number>(DATA_KEYS.ParallelIndex) ?? 0;
    scope.setLocal(DATA_KEYS.ParallelIndex, number + 1);
    return number;
  }

  static getRootCheckpoints(scope: ScopeContext) {
    let checkpoints = scope.get<ParallelCheckpoints>(
      DATA_KEYS.ParallelCheckpointsRoot
    );
    if (!checkpoints) {
      checkpoints = {
        checkpoints: {},
      };
      scope.root.set(DATA_KEYS.ParallelCheckpointsRoot, checkpoints);
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

    // Logger.warn(`Removing: ${uniqueId}`);
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
    scope.set(DATA_KEYS.ParallelCheckpointsRoot, checkpoints);
  }

  private async wrapElement<T>(
    item: any,
    tracker: ProgressTracker,
    fn: () => Promise<T>
  ) {
    const checkpointId = `${this.#uniqueId}[${JSON.stringify(item)}]`;
    const scope = getCurrentScope();
    scope.set(DATA_KEYS.CheckpointUniqueId, checkpointId);
    const result = await fn();
    scope.set(DATA_KEYS.CheckpointUniqueId, this.#uniqueId);
    tracker.increase();
    Parallel.markCheckpointAsFinished(scope, checkpointId);
    return result;
  }
}

export function parallel(name?: string) {
  return new Parallel(name);
}
