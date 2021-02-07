import { Logger } from "../../util/logger";
import { HttpRequestError } from "../http-request-performer";
import { RequestInterceptor, ResponseInterceptor } from "./interfaces";

const RETRIES_CONTEXT = "retries";

/**
 * Automatically retries failed requests.
 * Optionally sleeps before each retried request.
 * @param retryCount How many times should it retry
 * @param sleepMs Sleep period in milliseconds
 */
export const retryInterceptor = (
  retryCount: number,
  sleepMs: number = 0
): ResponseInterceptor & RequestInterceptor => {
  return {
    interceptRequest: async (input, config, context) => {
      const retries: number = context[RETRIES_CONTEXT] ?? 0;
      if (retries > 0 && sleepMs > 0) {
        Logger.verbose(`Sleeping for: ${sleepMs}ms`);
        await sleep(sleepMs);
      }
    },
    interceptResponse: async (output, config, context) => {
      if (output.success) {
        return;
      }

      const retries: number = context[RETRIES_CONTEXT] ?? 0;
      if (retries < retryCount) {
        context[RETRIES_CONTEXT] = retries + 1;
        Logger.verbose(`Retries: ${retries}/${retryCount}`);
        return {
          success: false,
          errorCode: HttpRequestError.Other,
          retry: true,
        };
      }
    },
  };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
