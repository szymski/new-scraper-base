import async from "async";
import { AbortedException } from "../exceptions";
import {
  CheckpointContainer,
  CheckpointFeature,
} from "./feature/features/checkpoint";
import { ProgressFeature } from "./feature/features/progress";
import { ProgressTracker } from "./progress-tracker";
import { getCurrentScope } from "./scope";
import { ScopeContext } from "./scope/scope-context";

interface ParallelCheckpoint {
  finished: boolean;
}

export class Parallel {
  #name?: string;

  #checkpointContainer: CheckpointContainer;

  #taskLimit = 1;

  constructor(name?: string) {
    this.#name = name;
    this.#checkpointContainer = getCurrentScope()
      .feature(CheckpointFeature)
      .createCheckpointContainer();
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
      name: this.#checkpointContainer.uniqueId,
      start: 0,
      max: elements.length,
    });

    await async
      .eachLimit(elements, this.#taskLimit, async (item) => {
        this.throwIfAborted(scope);
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
      name: this.#checkpointContainer.uniqueId,
      start: start,
      max: end,
    });

    await async
      .timesLimit(end - start, this.#taskLimit, async (n) => {
        this.throwIfAborted(scope);
        await this.wrapElement(n, tracker, async () => await fn(start + n));
      })
      .finally(() => {
        tracker.finish();
      });
  }

  /**
   * Parallelize actions performed in a for loop, without known sequence length.
   *
   * The callback should return a boolean value which indicates if execution should be continued
   * or a number which indicates the maximum number (inclusive).
   * @param fn Function to run for each element
   */
  async countWhile(
    start: number,
    fn: (i: number) => Promise<boolean | number>
  ) {
    const scope = getCurrentScope();

    const tracker = scope.feature(ProgressFeature).create({
      name: this.#checkpointContainer.uniqueId,
      start: start,
    });

    let max: number | undefined;

    // TODO: Implement concurrency for unknown sequence lengths
    try {
      for (let i = start; max ? i <= max : true; i++) {
        this.throwIfAborted(scope);
        const returned = await this.wrapElement<boolean | number>(
          i,
          tracker,
          async () => await fn(i)
        );
        if (Number.isInteger(returned)) {
          max = returned as number;
          tracker.setMax(max);
        }
        // We only break the loop if returned value is false precisely.
        // Checkpoint function wrapper might ignore it and return undefined.
        // In that case we don't know if there are any items there and we have to continue.
        else if (returned === false) {
          break;
        }
      }
    } finally {
      tracker.finish();
    }
  }

  private async wrapElement<T>(
    item: any,
    tracker: ProgressTracker,
    fn: () => Promise<T>
  ): Promise<T> {
    const result = await this.#checkpointContainer.runForItem(item, fn);

    tracker.increase();

    return result;
  }

  private throwIfAborted(scope: ScopeContext) {
    if (scope.root.abortController.signal.aborted) {
      throw new AbortedException();
    }
  }
}

export function parallel(name?: string) {
  return new Parallel(name);
}
