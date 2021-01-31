import {
  InterceptorLike,
  RequestInterceptor,
  RequestInterceptorLike,
  ResponseInterceptor,
  ResponseInterceptorLike,
} from "./interfaces";

export const isRequestInterceptorObject = (
  interceptor: InterceptorLike | RequestInterceptorLike
): interceptor is RequestInterceptor => "interceptRequest" in interceptor;

export const isResponseInterceptorObject = (
  interceptor: InterceptorLike | ResponseInterceptorLike
): interceptor is ResponseInterceptor => "interceptResponse" in interceptor;
