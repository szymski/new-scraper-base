import { Cookie, CookieJar } from "tough-cookie";
import {
  isRequestInterceptorObject,
  isResponseInterceptorObject,
} from "./interceptors/helpers";
import {
  InterceptorLike,
  RequestInterceptorFunction,
  RequestInterceptorLike,
  ResponseInterceptorFunction,
  ResponseInterceptorLike,
} from "./interceptors/interfaces";
import { Encoding, HttpHeaderAdd } from "./interfaces";

// TODO: Get rid of this interface?
export interface HttpClientConfig {
  baseUrl: string;
  headers: Record<string, string>;
  cookies: CookieJar | undefined;
  readonly interceptors: HttpClientConfigInterceptors;
  readonly add: HttpHeaderAdd<HttpClientConfig>;

  clone(): HttpClientConfig;
}

interface HttpClientConfigInterceptors {
  request: RequestInterceptorFunction[];
  response: ResponseInterceptorFunction[];
}

export class HttpClientConfig {
  baseUrl!: string;
  responseEncoding?: Encoding;
  requestEncoding?: Encoding;
  headers: Record<string, string> = {};
  cookies: CookieJar | undefined = undefined;
  urlParams = new URLSearchParams();
  readonly interceptors: HttpClientConfigInterceptors = {
    request: [],
    response: [],
  };

  readonly add: HttpHeaderAdd<HttpClientConfig> = {
    header: (key: string, value: string) => {
      this.headers[key] = value;
      return this;
    },
    headers: (headers: Record<string, string>) => {
      this.headers = headers;
      return this;
    },
    cookie: (cookie: Cookie, url: string) => {
      if (!this.cookies) {
        this.cookies = new CookieJar();
      }
      this.cookies.setCookieSync(cookie, url);
      return this;
    },
    cookies: (cookies: CookieJar) => {
      this.cookies = cookies;
      return this;
    },
    urlParam: (key: string, value: string | number) => {
      this.urlParams.set(key, value.toString());
      return this;
    },
    urlParams: (params: Record<string, string | number>) => {
      for (const [key, value] of Object.entries(params)) {
        this.urlParams.set(key, value.toString());
      }
      return this;
    },
    requestInterceptor: (interceptor: RequestInterceptorLike) => {
      this.interceptors.request.push(
        isRequestInterceptorObject(interceptor)
          ? interceptor.interceptRequest
          : interceptor
      );
      return this;
    },
    responseInterceptor: (interceptor: ResponseInterceptorLike) => {
      this.interceptors.response.push(
        isResponseInterceptorObject(interceptor)
          ? interceptor.interceptResponse
          : interceptor
      );
      return this;
    },
    interceptor: (interceptor: InterceptorLike) => {
      if (isRequestInterceptorObject(interceptor)) {
        this.interceptors.request.push(interceptor.interceptRequest);
      }
      if (isResponseInterceptorObject(interceptor)) {
        this.interceptors.response.push(interceptor.interceptResponse);
      }
      return this;
    },
    responseEncoding: (encoding: string) => {
      this.responseEncoding = encoding;
      return this;
    },
    requestEncoding: (encoding: string) => {
      this.requestEncoding = encoding;
      return this;
    },
  };

  clone(): HttpClientConfig {
    return HttpClientConfig.concat(this);
  }

  static concat(...configs: HttpClientConfig[]): HttpClientConfig {
    const result = new HttpClientConfig();
    result.urlParams = new URLSearchParams();

    // We won't merge empty/undefined cookie jars for performance, hence the undefined
    let serializedCookies: CookieJar.Serialized | undefined;

    for (const config of configs) {
      result.baseUrl = config.baseUrl ?? result.baseUrl;
      result.responseEncoding =
        config.responseEncoding ?? result.responseEncoding;
      result.requestEncoding = config.requestEncoding ?? result.requestEncoding;
      result.headers = { ...result.headers, ...config.headers };
      if (config.cookies) {
        if (!serializedCookies) {
          serializedCookies = new CookieJar().serializeSync();
        }
        for (const cookie of config.cookies.serializeSync().cookies) {
          serializedCookies.cookies.push(cookie);
        }
      }
      config.urlParams.forEach((value, key) =>
        result.urlParams.set(key, value)
      );
      result.interceptors.request = [
        ...result.interceptors.request,
        ...config.interceptors.request,
      ];
      result.interceptors.response = [
        ...result.interceptors.response,
        ...config.interceptors.response,
      ];
    }

    if(serializedCookies) {
      result.cookies = CookieJar.deserializeSync(serializedCookies);
    }

    return result;
  }
}
