import { CookieJar } from "tough-cookie";
import { RequestInterceptor, ResponseInterceptor } from "./interfaces";

/**
 * Persist received cookies in memory.
 * @param bootstrapCookie If set to true, on the first request, if there are no cookies set,
 * an additional initial HTTP request will be performed to get cookies.
 * This is often required by session functionalities (like logging-in) to work properly.
 * The initial request will be performed using GET method with empty body.
 */
export const persistCookieInterceptor = (
  bootstrapCookie: boolean = true
): ResponseInterceptor & RequestInterceptor => {
  let bootstrapped = false;
  const cookies = new CookieJar();

  return {
    interceptRequest: async (input, config, context) => {
      if(bootstrapCookie && !bootstrapped) {
        input.method = "get";
        input.bodyType = "null";
        input.body = null;
      }
      else {
        const resultCookies =
          (await input.cookies?.serialize()) ??
          (await new CookieJar().serialize());
        const thisCookies = await cookies.serialize();
        resultCookies.cookies = resultCookies.cookies.concat(thisCookies.cookies);
        input.cookies = await CookieJar.deserialize(resultCookies);
      }
    },

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

        if(!bootstrapped && bootstrapCookie) {
          bootstrapped = true;
          output.retry = true;
        }
      }
    },
  };
};
