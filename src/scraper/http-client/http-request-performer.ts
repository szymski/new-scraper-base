import { AbortSignal } from "abort-controller";
import { CookieJar } from "tough-cookie";
import {
  HttpMethod,
  HttpRequestBodyType,
  HttpRequestPerformerResponseType,
} from "./http-client";

export enum HttpRequestError {
  Timeout = "timeout",
  InvalidUrl = "invalid_url",
  AddressNotFound = "address_not_found",
  PurposefulInterruption = "purposeful_interruption",
  Other = "other",
  Aborted = "aborted",
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
  abortSignal?: AbortSignal;
}

export interface HttpRequestPerformOutputFail {
  success: false;
  errorCode: HttpRequestError;
  errorMessage?: string;
  retry?: boolean;
}

export interface HttpRequestPerformOutputSuccess {
  url: string;
  success: true;
  statusCode: number;
  headers: Record<string, string>;
  data: any;
  retry?: boolean;
}

export type HttpRequestPerformOutput =
  | HttpRequestPerformOutputFail
  | HttpRequestPerformOutputSuccess;
