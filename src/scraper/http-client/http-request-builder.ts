// TODO: Clean this up

import { AbortSignal } from "abort-controller";
import Cheerio from "cheerio";
import iconv from "iconv-lite";
import { AbortedException } from "../exceptions";
import { getCurrentScopeNoFail } from "../robot/scope";
import {
  HttpAddressNotFoundException,
  HttpBuilderAlreadyUsed,
  HttpException,
  HttpForbiddenException,
  HttpInvalidUrlException,
  HttpNotFoundException,
  HttpTimeoutException,
  HttpUnauthorizedException,
} from "./exceptions";
import {
  HttpClient,
  HttpMethod,
  HttpRequestBodyType,
  HttpRequestPerformerResponseType,
} from "./http-client";
import { HttpClientConfig } from "./http-client-config";
import {
  HttpRequestError,
  HttpRequestPerformInput,
  HttpRequestPerformOutput,
  HttpRequestPerformOutputSuccess,
} from "./http-request-performer";
import {
  InterceptorLike,
  RequestInterceptorLike,
  ResponseInterceptorLike,
} from "./interceptors/interfaces";
import { HttpRequestAdd } from "./interfaces";
import CheerioAPI = cheerio.CheerioAPI;
import Root = cheerio.Root;

export interface HttpRequestBuilder {
  appendConfig(config: HttpClientConfig): this;

  replaceConfig(config: HttpClientConfig): this;

  json<T = any>(): Promise<T>;

  text(): Promise<string>;

  cheerio(): Promise<CheerioAPI>;

  buffer(): Promise<Buffer>;

  void(): Promise<void>;

  readonly withHeaders: {
    json<T = any>(): Promise<HttpResponse<T>>;

    text(): Promise<HttpResponse<string>>;

    cheerio(): Promise<HttpResponse<CheerioAPI | Root>>;

    buffer(): Promise<HttpResponse<Buffer>>;

    void(): Promise<HttpResponse<void>>;
  };

  readonly add: HttpRequestAdd<HttpRequestBuilder>;
}

export interface HttpResponse<Data> {
  status: number;
  headers: Record<string, string>;
  data: Data;
}

export class HttpRequestBuilder {
  #config: HttpClientConfig;

  #body: { type: HttpRequestBodyType; value: any } = {
    type: "null",
    value: null,
  };

  #context: Record<string, any> = {};

  #used = false;

  #abortSignal?: AbortSignal;

  constructor(
    private readonly client: HttpClient,
    private readonly method: HttpMethod,
    private readonly url: string,
    private readonly perform: (
      request: HttpRequestPerformInput
    ) => Promise<HttpRequestPerformOutput>
  ) {
    this.#config = client.config.clone();
    // TODO: Maybe move this to an interceptor
    this.#abortSignal = getCurrentScopeNoFail()?.root.abortController.signal;
  }

  text(): Promise<string> {
    return this.withHeaders.text().then((res) => res.data);
  }

  json<T = any>(): Promise<T> {
    return this.withHeaders.json<T>().then((res) => res.data);
  }

  cheerio(): Promise<CheerioAPI | Root> {
    return this.withHeaders.cheerio().then((res) => res.data);
  }

  buffer(): Promise<Buffer> {
    return this.withHeaders.buffer().then((res) => res.data);
  }

  void(): Promise<void> {
    return this.withHeaders.void().then((res) => res.data);
  }

  appendConfig(config: HttpClientConfig): HttpRequestBuilder {
    this.#config = HttpClientConfig.concat(this.#config, config);
    return this;
  }

  replaceConfig(config: HttpClientConfig): HttpRequestBuilder {
    this.#config = config;
    return this;
  }

  readonly withHeaders = {
    text: (): Promise<HttpResponse<string>> => {
      return this.runRetryingRequest("text", (res) => res.data);
    },
    json: <T = any>(): Promise<HttpResponse<T>> => {
      this.add.header("Accept", "application/json; utf-8");
      return this.runRetryingRequest("text", (res) => JSON.parse(res.data));
    },
    cheerio: (): Promise<HttpResponse<CheerioAPI | Root>> => {
      return this.runRetryingRequest("text", (res) => Cheerio.load(res.data));
    },
    buffer: (): Promise<HttpResponse<Buffer>> => {
      return this.runRetryingRequest("buffer", (res) => res.data);
    },
    void: (): Promise<HttpResponse<void>> => {
      return this.runRetryingRequest("void", (res) => undefined);
    },
  };

  /**
   * Runs performing in an infinite loop, unless output retry is false.
   */
  private async runRetryingRequest<T>(
    responseType: HttpRequestPerformerResponseType,
    getDataCallback: (res: HttpRequestPerformOutputSuccess) => any
  ): Promise<HttpResponse<T>> {
    // If we want to get text response and custom encoding is enabled, fetch buffer and decode it instead
    if (responseType === "text" && this.#config.responseEncoding) {
      const originalCallback = getDataCallback;
      responseType = "buffer";
      getDataCallback = (res) => {
        const buffer: Buffer = res.data;
        res.data = iconv.decode(buffer, this.#config.responseEncoding!);
        return originalCallback(res);
      };
    }

    if (this.#used) {
      throw new HttpBuilderAlreadyUsed();
    }

    this.#used = true;

    while (true) {
      const input = await this.getPerformInput(responseType);
      const output = await this.performAndIntercept(input);

      if (output.retry) {
        continue;
      }

      const response = await this.processOutput(output, getDataCallback);
      return response;
    }
  }

  private async processOutput<T>(
    output: HttpRequestPerformOutput,
    getDataCallback: (res: HttpRequestPerformOutputSuccess) => T
  ): Promise<HttpResponse<T>> {
    if (output.success) {
      const response: HttpResponse<T> = {
        status: output.statusCode,
        headers: output.headers,
        data: await getDataCallback(output),
      };

      if (output.statusCode === 404) {
        throw new HttpNotFoundException(response);
      } else if (output.statusCode === 403) {
        throw new HttpForbiddenException(response);
      } else if (output.statusCode === 401) {
        throw new HttpUnauthorizedException(response);
      } else {
        return response;
      }
    } else {
      if (output.errorCode === HttpRequestError.Timeout) {
        throw new HttpTimeoutException(output.errorMessage);
      } else if (output.errorCode === HttpRequestError.InvalidUrl) {
        throw new HttpInvalidUrlException(output.errorMessage);
      } else if (output.errorCode === HttpRequestError.AddressNotFound) {
        throw new HttpAddressNotFoundException(output.errorMessage);
      } else if (output.errorCode === HttpRequestError.PurposefulInterruption) {
        throw new HttpException("Request interrupted on purpose");
      } else if (output.errorCode === HttpRequestError.Aborted) {
        throw new AbortedException();
      } else {
        throw new HttpException(output.errorMessage);
      }
    }
  }

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
      this.add.header("Content-Type", "application/json; utf-8");
      this.#body = {
        value: JSON.stringify(body),
        type: "text",
      };
      return this;
    },
    requestInterceptor: (interceptor: RequestInterceptorLike) => {
      this.#config.add.requestInterceptor(interceptor);
      return this;
    },
    responseInterceptor: (interceptor: ResponseInterceptorLike) => {
      this.#config.add.responseInterceptor(interceptor);
      return this;
    },
    interceptor: (interceptor: InterceptorLike) => {
      this.#config.add.interceptor(interceptor);
      return this;
    },
    responseEncoding: (encoding: string) => {
      this.#config.responseEncoding = encoding;
      return this;
    },
    requestEncoding: (encoding: string) => {
      this.#config.requestEncoding = encoding;
      return this;
    },
  };

  private async getPerformInput(
    responseType: HttpRequestPerformerResponseType
  ): Promise<HttpRequestPerformInput> {
    const urlParamsString = this.#config.urlParams.toString();
    const joinedUrl = this.joinUrl(
      this.#config.baseUrl,
      this.url,
      urlParamsString
    );

    let body = this.#body;

    if (this.#body.type === "text" && this.#config.requestEncoding) {
      body.type = "buffer";
      body.value = iconv.encode(this.#body.value, this.#config.requestEncoding);
    }

    let input: HttpRequestPerformInput = {
      method: this.method,
      url: joinedUrl,
      bodyType: body.type,
      body: body.value,
      headers: this.#config.headers,
      cookies: this.#config.cookies,
      responseType: responseType,
      abortSignal: this.#abortSignal,
    };

    for (const interceptor of this.#config.interceptors.request) {
      input =
        <any>await interceptor(input, this.#config, this.#context) ?? input;
    }

    return input;
  }

  private joinUrl(base: string, url: string, params: string) {
    let prefix = base || "";
    let middle = url;
    let suffix = params;

    if (prefix.endsWith("/")) {
      prefix = prefix.substr(0, prefix.length - 1);
    }

    if (prefix && !url.startsWith("/")) {
      prefix += "/";
    }

    if (suffix && !middle.endsWith("/?")) {
      if (middle.endsWith("/")) {
        suffix = "?" + suffix;
      } else {
        suffix = "/?" + suffix;
      }
    }

    if (
      url.toLowerCase().startsWith("http://") ||
      url.toLowerCase().startsWith("https://")
    ) {
      prefix = "";
    }

    return `${prefix}${middle}${suffix}`;
  }

  private async performAndIntercept(input: HttpRequestPerformInput) {
    let response = await this.perform(input);

    for (const interceptor of this.#config.interceptors.response) {
      response =
        <any>await interceptor(response, this.#config, this.#context) ??
        response;
    }

    return response;
  }
}
