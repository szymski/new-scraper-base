import { HttpClientConfig } from "./http-client-config";
import { HttpRequestBuilder } from "./http-request-builder";
import {
  HttpRequestPerformer,
  HttpRequestPerformInput,
  HttpRequestPerformOutput,
} from "./http-request-performer";

export type HttpMethod = "get" | "post" | "head" | "patch" | "delete" | "put";
export type HttpRequestBodyType = "null" | "text";
export type HttpRequestPerformerResponseType = "text" | "buffer" | "void";

export interface HttpClient {
  get(url: string): HttpRequestBuilder;

  post(url: string): HttpRequestBuilder;

  patch(url: string): HttpRequestBuilder;

  head(url: string): HttpRequestBuilder;

  put(url: string): HttpRequestBuilder;

  delete(url: string): HttpRequestBuilder;

  config: HttpClientConfig;
}

export class HttpClient {
  config = new HttpClientConfig();

  constructor(private readonly performer: HttpRequestPerformer) {}

  get(url: string) {
    return this.createRequestBuilder("get", url);
  }

  post(url: string) {
    return this.createRequestBuilder("post", url);
  }

  head(url: string) {
    return this.createRequestBuilder("head", url);
  }

  patch(url: string) {
    return this.createRequestBuilder("patch", url);
  }

  delete(url: string) {
    return this.createRequestBuilder("delete", url);
  }

  put(url: string) {
    return this.createRequestBuilder("put", url);
  }

  private createRequestBuilder(
    method: HttpMethod,
    url: string
  ): HttpRequestBuilder {
    return new HttpRequestBuilder(this, method, url, (data) =>
      this.perform(data)
    );
  }

  private perform(
    request: HttpRequestPerformInput
  ): Promise<HttpRequestPerformOutput> {
    return this.performer.perform(request);
  }
}
