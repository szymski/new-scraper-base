import { Logger } from "../../util/logger";

export interface FindPageCountConfig {
  hasItems: FindPageCountCallback;
  min?: number;
  max?: number;
}

export type FindPageCountCallback = (page: number) => Promise<boolean>;

const defaultConfig: Partial<FindPageCountConfig> = {
  max: 100,
  min: 1
};

/**
 * Finds page count using binary search.
 * Useful when a website doesn't display total page/item count,
 * but rather requires to iterate through pages to find the last page.
 * @param config A object containing all necessary values and callback for finding page count
 */
export function findPageCount(config: FindPageCountConfig): Promise<number>;
/**
 * Finds page count using binary search.
 * Useful when a website doesn't display total page/item count,
 * but rather requires to iterate through pages to find the last page.
 * @param callback A function which returns whether a given page has items
 */
export function findPageCount(callback: FindPageCountCallback): Promise<number>;

export async function findPageCount(callbackOrConfig: FindPageCountConfig | FindPageCountCallback): Promise<number> {
  Logger.verbose(`Finding page count...`);

  const config: FindPageCountConfig = {
    ...defaultConfig,
    ...(typeof callbackOrConfig === "function" ? { hasItems: callbackOrConfig } : callbackOrConfig)
  };

  if (config.min === undefined || config.max === undefined) {
    throw new Error("Min or max page cannot be undefined!");
  }

  if (config.min > config.max) {
    throw new Error("Min page cannot be bigger than max page!");
  }

  let guesses = 0;

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