import { CookieJar } from "tough-cookie";
import { RequestInterceptor, ResponseInterceptor } from "./interfaces";

/**
 * Persist received cookies in memory.
 */
export const persistCookieInterceptor = (): ResponseInterceptor &
  RequestInterceptor => {
  const cookies = new CookieJar();

  return {
    interceptRequest: async (input, config, context) => {
      const resultCookies = await input.cookies.serialize();
      const thisCookies = await cookies.serialize();
      resultCookies.cookies = resultCookies.cookies.concat(thisCookies.cookies);
      input.cookies = await CookieJar.deserialize(resultCookies);
    },

    interceptResponse: async (output, config, context) => {
      if (output.success) {
        // TODO: There can be multiple Set-Cookie headers
        const setCookieHeader = Object.entries(output.headers).find(
          (x) => x[0].toLowerCase() === "set-cookie"
        );
        if (setCookieHeader) {
          await cookies.setCookie(setCookieHeader[1], output.url);
        }
      }
    },
  };
};
