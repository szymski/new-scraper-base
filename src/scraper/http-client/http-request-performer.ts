import { CookieJar } from "tough-cookie";
import { HttpMethod, HttpRequestBodyType, HttpRequestPerformerResponseType } from "./http-client";

export enum HttpRequestError {
  Timeout = "timeout",
  InvalidUrl = "invalid_url",
  Other = "other",
}

export interface HttpRequestPerformer {
  perform(data: HttpRequestPerformInput): Promise<HttpRequestPerformOutput>;
}

export interface HttpRequestPerformInput {
  method: HttpMethod;
  url: string;
  bodyType: HttpRequestBodyType;
  body: any;
  headers: Record<string, string>;
  cookies: CookieJar;
  responseType: HttpRequestPerformerResponseType;
}

export interface HttpRequestPerformOutputFail {
  success: false;
  errorCode: HttpRequestError;
  errorMessage?: string;
}

export interface HttpRequestPerformOutputSuccess {
  success: true;
  statusCode: number;
  headers: Record<string, string>;
  data: any;
}

export type HttpRequestPerformOutput = HttpRequestPerformOutputFail | HttpRequestPerformOutputSuccess;
