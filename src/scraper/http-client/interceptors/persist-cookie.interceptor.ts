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
      const resultCookies = await input.cookies?.serialize() ?? await new CookieJar().serialize();
      const thisCookies = await cookies.serialize();
      resultCookies.cookies = resultCookies.cookies.concat(thisCookies.cookies);
      input.cookies = await CookieJar.deserialize(resultCookies);
    },

    // TODO: We might want to repeat first request if no cookies present - websites often need cookie bootstrap before login
    interceptResponse: async (output, config, context) => {
      if (output.success) {
        // TODO: There might be multiple Set-Cookie headers, but such form of HTTP response is obsolete (https://stackoverflow.com/a/6375214/4272179)
        // If cookie persistence on older websites won't for for some reason, this is the potential root of the problem
        const setCookieHeader = Object.entries(output.headers).find(
          (header) => header[0].toLowerCase() === "set-cookie"
        );
        if (setCookieHeader) {
          await cookies.setCookie(setCookieHeader[1], output.url);
        }
      }
    },
  };
};
