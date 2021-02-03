import fetch from "node-fetch";
import { HttpRequestPerformer, HttpRequestPerformInput, HttpRequestPerformOutput } from "../http-request-performer";

export class NodeFetchPerformer implements HttpRequestPerformer {
  async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
    const res = await fetch(input.url, {
      method: input.method,
      body: input.body ?? undefined,
      headers: input.headers,
    });

    switch (input.responseType) {
      case "void":
        return {
          data: null,
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      case "text":
        return {
          data: await res.text(),
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
      case "buffer":
        return {
          data: await res.buffer(),
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        };
    }
  }
}
