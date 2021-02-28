import { Cookie, CookieJar } from "tough-cookie";
import {
  InterceptorLike,
  RequestInterceptorLike,
  ResponseInterceptorLike,
} from "./interceptors/interfaces";

type NodeEncodings = "ascii" | "utf-8" | "utf8" | "latin1" | "utf-16le" | "utf16le";

export type Encoding = NodeEncodings | string;

export interface HttpHeaderAdd<TReturn> {
  header(key: string, value: string): TReturn;

  headers(headers: Record<string, string>): TReturn;

  urlParam(key: string, value: string | number): TReturn;

  urlParams(params: Record<string, string | number>): TReturn;

  cookie(cookies: Cookie, url: string): TReturn;

  cookies(cookies: CookieJar): TReturn;

  requestInterceptor(interceptor: RequestInterceptorLike): TReturn;

  responseInterceptor(interceptor: ResponseInterceptorLike): TReturn;

  interceptor(interceptor: InterceptorLike): TReturn;

  responseEncoding(encoding: Encoding): TReturn;

  requestEncoding(encoding: Encoding): TReturn;
}

export interface HttpBodyAdd<TReturn> {
  body(body: string): TReturn;

  jsonBody(body: any): TReturn;
}

export type HttpRequestAdd<TReturn> = HttpHeaderAdd<TReturn> &
  HttpBodyAdd<TReturn>;
