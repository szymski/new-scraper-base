import { HttpClientConfig } from "../http-client-config";
import {
  HttpRequestPerformInput,
  HttpRequestPerformOutput,
} from "../http-request-performer";

export type RequestInterceptorLike =
  | RequestInterceptor
  | RequestInterceptorFunction;
export type ResponseInterceptorLike =
  | ResponseInterceptor
  | ResponseInterceptorFunction;
export type InterceptorLike = RequestInterceptor | ResponseInterceptor;

export interface RequestInterceptor {
  interceptRequest: RequestInterceptorFunction;
}

export interface ResponseInterceptor {
  interceptResponse: ResponseInterceptorFunction;
}

export type RequestContext = Record<string, any>;

export type RequestInterceptorFunction = (
  input: HttpRequestPerformInput,
  config: HttpClientConfig,
  context: RequestContext
) => Promise<HttpRequestPerformInput | undefined | void>;

export type ResponseInterceptorFunction = (
  output: HttpRequestPerformOutput,
  config: HttpClientConfig,
  context: RequestContext
) => Promise<HttpRequestPerformOutput | undefined | void>;
