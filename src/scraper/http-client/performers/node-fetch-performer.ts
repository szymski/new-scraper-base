import fetch, { FetchError } from "node-fetch";
import {
  HttpRequestError,
  HttpRequestPerformer,
  HttpRequestPerformInput,
  HttpRequestPerformOutput,
} from "../http-request-performer";
import {Logger} from "../../util/logger";

const TYPE_REQUEST_TIMEOUT = "request-timeout";
const TYPE_SYSTEM = "system";
const TYPE_ABORTED = "aborted";

export class NodeFetchPerformer implements HttpRequestPerformer {
  async perform(
    input: HttpRequestPerformInput
  ): Promise<HttpRequestPerformOutput> {
    try {
      const res = await fetch(input.url, {
        method: input.method,
        body: input.body ?? undefined,
        headers: input.headers,
        signal: input.abortSignal,
      });

      let data: any;

      switch (input.responseType) {
        case "text":
          data = await res.text();
          break;
        case "buffer":
          data = await res.buffer();
          break;
        case "void":
          data = undefined;
          break;
      }

      return {
        success: true,
        data,
        statusCode: res.status,
        headers: Object.fromEntries(res.headers.entries()),
      };
    } catch (e) {
      if (e instanceof FetchError) {
        if (e.type === TYPE_REQUEST_TIMEOUT) {
          return {
            success: false,
            errorCode: HttpRequestError.Timeout,
            errorMessage: e.message,
          };
        } else if (e.type === TYPE_SYSTEM) {
          if (e.code === "ENOTFOUND") {
            return {
              success: false,
              errorCode: HttpRequestError.AddressNotFound,
              errorMessage: e.message,
            };
          } else {
            return {
              success: false,
              errorCode: HttpRequestError.Other,
              errorMessage: e.message,
            };
          }
        }
        console.log("Type:", e.type);
      } else if (e instanceof TypeError) {
        if (
          e.message.match(
            /Only absolute URLs are supported|Only HTTP(S) protocols are supported/i
          )
        ) {
          return {
            success: false,
            errorCode: HttpRequestError.InvalidUrl,
            errorMessage: e.message,
          };
        }
      }
      else if(e.type ===  TYPE_ABORTED) {
        return {
          success: false,
          errorCode: HttpRequestError.Aborted,
          errorMessage: "Aborted",
        }
      }
      console.log(e);
      throw e;
    }
  }
}
