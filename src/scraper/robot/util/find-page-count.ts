import { Logger } from "../../util/logger";

/**
 * Finds page count using binary search.
 * Useful when a website doesn't display total page/item count,
 * but rather requires to iterate through pages to find the last page.
 * @param fn A function which returns whether a given page has items
 */
export async function findPageCount(fn: (page: number) => Promise<boolean>): Promise<number> {
  Logger.verbose(`Finding page count...`);

  let min = 1; // TODO: Parametrize this
  let max = 100; // TODO: Parametrize this

  let guesses = 0;

  while (true) {
    guesses++;
    const current = Math.floor((min + max) / 2);

    const hasItems = await fn(current);

    // Logger.warn(
    //   `min: ${min}, max: ${max}, current: ${current}, found: ${hasItems}`
    // );

    // Search right
    if (hasItems) {
      min = current;
      max += max - min;
    }
    // Search left
    else {
      max = current;
    }

    if (max - min <= 1) {
      Logger.verbose(`Found page count (${min}) after ${guesses} guesses`);
      return min;
    }
  }
}
