import {Cookie, CookieJar} from "tough-cookie";

export interface HttpHeaderAdd<TReturn> {
  header(key: string, value: string): TReturn;

  headers(headers: Record<string, string>): TReturn;

  urlParam(key: string, value: string | number): TReturn;

  urlParams(params: Record<string, string | number>): TReturn;

  cookie(cookies: Cookie, url: string): TReturn;

  cookies(cookies: CookieJar): TReturn;
}

export interface HttpBodyAdd<TReturn> {
  body(body: string): TReturn;

  jsonBody(body: any): TReturn;
}

export type HttpRequestAdd<TReturn> = HttpHeaderAdd<TReturn> & HttpBodyAdd<TReturn>;
