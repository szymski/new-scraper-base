import async from "async";
import ProgressBar from "progress";
import { getCurrentScope } from "./scope";

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
    const bar = Parallel.createBar(elements.length, scope.executionName);

    await async
      .eachLimit(elements, this.#taskLimit, async (item) => {
        await fn(item);
        bar.tick();
      })
      .finally(() => {
        bar.terminate();
      });
  }

  /**
   * Parallelize actions performed in a for loop.
   * @param elements Sequence of elements
   * @param fn Function to run for each element
   */
  async for<T>(start: number, end: number, fn: (i: number) => void) {
    const scope = getCurrentScope();
    const bar = Parallel.createBar(end - start, scope.executionName);
    await async
      .timesLimit(end - start, this.#taskLimit, async (n) => {
        await fn(start + n);
        bar.tick();
      })
      .finally(() => {
        bar.terminate();
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

  private static createBar(total: number, label?: string) {
    return new ProgressBar(
      (label ? `${label} ` : "") + "[:bar] :rate/s :percent ETA: :etas",
      {
        total,
        width: 40,
        incomplete: " ",
        complete: "█",
        head: "▍",
      }
    );
  }
}

export function parallel() {
  return new Parallel();
}
