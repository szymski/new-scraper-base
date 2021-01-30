import {HttpHeaderAdd} from "./interfaces";
import {Cookie, CookieJar} from "tough-cookie";

export interface HttpClientConfig {
  baseUrl: string;
  headers: Record<string, string>;
  cookies: CookieJar;
  readonly add: HttpHeaderAdd<HttpClientConfig>;

  clone(): HttpClientConfig;
}

export class HttpClientConfig {
  baseUrl!: string;
  headers: Record<string, string> = {};
  cookies: CookieJar = new CookieJar();
  urlParams = new URLSearchParams();

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
      // TODO: This should be awaited
      this.cookies.setCookie(cookie, url);
      return this;
    },
    cookies: (cookies: CookieJar) => {
      this.cookies = cookies;
      return this;
    },
    urlParam: (key: string, value: string | number) => {
      this.urlParams.set(key, value.toString())
      return this;
    },
    urlParams: (params: Record<string, string | number>) => {
      for (const [key, value] of Object.entries(params)) {
        this.urlParams.set(key, value.toString());
      }
      return this;
    }
  };

  clone(): HttpClientConfig {
    return HttpClientConfig.concat(this);
  };

  static concat(...configs: HttpClientConfig[]): HttpClientConfig {
    const result = new HttpClientConfig();
    result.urlParams = new URLSearchParams();

    for (const config of configs) {
      result.baseUrl = config.baseUrl ?? result.baseUrl;
      result.headers = {...result.headers, ...config.headers};
      // TODO: Concat cookies
      config.urlParams.forEach((value, key) => result.urlParams.set(key, value));
    }
    return result;
  }
}
