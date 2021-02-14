import { HttpRequestError } from "../http-request-performer";
import { ResponseInterceptor } from "./interfaces";

/**
 * Randomly makes some request fail with PurposefulInterruption code.
 * Can be used to test request retrying interceptors.
 * @param failRate Fraction of the requests which should fail (0-1).
 */
export const randomFailInterceptor = (
  failRate: number
): ResponseInterceptor => ({
  interceptResponse: async () => {
    if (Math.random() < failRate) {
      return {
        success: false,
        errorCode: HttpRequestError.PurposefulInterruption,
      };
    }
  },
});
