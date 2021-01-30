import {HttpRequestAdd} from "./interfaces";
import {HttpClientConfig} from "./http-client-config";
import Cheerio from "cheerio";
import {
  HttpClient,
  HttpMethod,
  HttpRequestBodyType, HttpRequestPerformerResponseType,
} from "./http-client";
import CheerioAPI = cheerio.CheerioAPI;
import Root = cheerio.Root;
import {HttpRequestPerformInput, HttpRequestPerformOutput} from "./http-request-performer";

export interface HttpRequestBuilder {
  json<T = any>(): Promise<T>;

  text(): Promise<string>;

  cheerio(): Promise<CheerioAPI>;

  buffer(): Promise<Buffer>;

  readonly add: HttpRequestAdd<HttpRequestBuilder>;

  appendConfig(config: HttpClientConfig): HttpRequestBuilder;
  replaceConfig(config: HttpClientConfig): HttpRequestBuilder;
}

export class HttpRequestBuilder {
  #config: HttpClientConfig;

  #body: { type: HttpRequestBodyType, value: any, } = {
    type: "null",
    value: null,
  };

  constructor(
    private readonly client: HttpClient,
    private readonly method: HttpMethod,
    private readonly url: string,
    private readonly perform: (request: HttpRequestPerformInput) => Promise<HttpRequestPerformOutput>,
  ) {
    this.#config = client.config.clone();
  }

  text(): Promise<string> {
    const input = this.getPerformInput("text");
    return this.perform(input)
      .then(res => res.data);
  };

  json<T = any>(): Promise<T> {
    const input = this.getPerformInput("text");
    return this.perform(input)
      .then(res => JSON.parse(res.data));
  };

  cheerio(): Promise<CheerioAPI | Root> {
    const input = this.getPerformInput("text");
    return this.perform(input)
      .then(res => Cheerio.load(res.data));
  };

  buffer(): Promise<Buffer> {
    const input = this.getPerformInput("buffer");
    return this.perform(input)
      .then(res => res.data);
  };

  appendConfig(config: HttpClientConfig): HttpRequestBuilder {
    this.#config = HttpClientConfig.concat(this.#config, config);
    return this;
  };

  replaceConfig(config: HttpClientConfig): HttpRequestBuilder {
    this.#config = config;
    return this;
  };

  readonly add: HttpRequestAdd<HttpRequestBuilder> = {
    urlParam: (key, value) => {
      this.#config.add.urlParam(key, value);
      return this;
    },
    urlParams: (params) => {
      this.#config.add.urlParams(params);
      return this;
    },
    header: (key, value) => {
      this.#config.add.header(key, value);
      return this;
    },
    headers: (headers) => {
      this.#config.add.headers(headers);
      return this;
    },
    cookie: (cookie, url) => {
      this.#config.add.cookie(cookie, url);
      return this;
    },
    cookies: (cookies) => {
      this.#config.add.cookies(cookies);
      return this;
    },
    body: (body) => {
      this.#body = {
        value: body,
        type: "text",
      };
      return this;
    },
    jsonBody: (body) => {
      this.#body = {
        value: body,
        type: "json",
      };
      return this;
    },
  };

  private getPerformInput(responseType: HttpRequestPerformerResponseType): HttpRequestPerformInput {
    const urlParamsString = this.#config.urlParams.toString();
    const normalizedBaseUrl = this.normalizeBaseUrl(this.#config.baseUrl);

    return {
      method: this.method,
      url: `${normalizedBaseUrl}${this.url}${urlParamsString ? `?${urlParamsString}` : ""}`,
      bodyType: this.#body.type,
      body: this.#body.value,
      headers: this.#config.headers,
      cookies: this.#config.cookies,
      responseType: responseType,
    };
  }

  private normalizeBaseUrl(url: string) {
    if(!url) {
      return "";
    }
    return url.endsWith("/") ? url : `${url}/`;
  }
}
