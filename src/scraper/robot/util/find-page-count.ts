import { Logger } from "../../util/logger";

export interface FindPageCountConfig {
  hasItems: (page: number) => Promise<boolean>;
  min?: number;
  max?: number;
}

export type FindPageCountCallback = (page: number) => Promise<boolean>;

/**
 * Finds page count using binary search.
 * Useful when a website doesn't display total page/item count,
 * but rather requires to iterate through pages to find the last page.
 * @param fn A function which returns whether a given page has items
 */
export async function findPageCount(cb: FindPageCountConfig | FindPageCountCallback): Promise<number> {
  Logger.verbose(`Finding page count...`);

  const defaultMax = 100;
  const defaultMin = 1;
  let guesses = 0;

  // insert default values
  let config: FindPageCountConfig = (typeof cb !== 'function') ?
    {
      hasItems: cb.hasItems,
      max: cb.max || defaultMax,
      min: cb.min || defaultMin
    } : {
      hasItems: cb as FindPageCountCallback,
      max: defaultMax,
      min: defaultMin
    }

  if (config.min === undefined || config.max === undefined)
    return Promise.reject("Min or max page cannot be undefined!");

  if (config.min > config.max)
    return Promise.reject("Min page cannot be bigger than max page!");

  while (true) {
    guesses++;
    const current = Math.floor((config.min + config.max) / 2);

    const hasItems = await config.hasItems(current);

    // Search right
    if (hasItems) {
      config.min = current;
      config.max += config.max - config.min;
    }
    // Search left
    else {
      config.max = current;
    }

    if (config.max - config.min <= 1) {
      Logger.verbose(`Found page count (${config.min}) after ${guesses} guesses`);
      return config.min;
    }
  }
}