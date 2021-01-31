import {HttpRequestPerformInput, HttpRequestPerformOutput} from "../http-request-performer";
import {HttpClientConfig} from "../http-client-config";

export type RequestInterceptorLike = RequestInterceptor | RequestInterceptorFunction;
export type ResponseInterceptorLike = ResponseInterceptor | ResponseInterceptorFunction;
export type InterceptorLike = RequestInterceptor | ResponseInterceptor;

export interface RequestInterceptor {
  interceptRequest: RequestInterceptorFunction;
}

export interface ResponseInterceptor {
  interceptResponse: ResponseInterceptorFunction;
}
export type RequestInterceptorFunction = (input: HttpRequestPerformInput, config: HttpClientConfig) => Promise<HttpRequestPerformInput | undefined | void>;

export type ResponseInterceptorFunction = (input: HttpRequestPerformOutput, config: HttpClientConfig) => Promise<HttpRequestPerformOutput | undefined | void>;
