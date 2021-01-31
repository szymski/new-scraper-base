import {CookieJar} from "tough-cookie";
import {HttpMethod, HttpRequestBodyType, HttpRequestPerformerResponseType} from "./http-client";

export interface HttpRequestPerformer {
  perform(data: HttpRequestPerformInput): Promise<HttpRequestPerformOutput>;
}

export interface HttpRequestPerformInput {
  method: HttpMethod,
  url: string;
  bodyType: HttpRequestBodyType;
  body: any;
  headers: Record<string, string>;
  cookies: CookieJar;
  responseType: HttpRequestPerformerResponseType;
}

export interface HttpRequestPerformOutput {
  statusCode: number;
  headers: Record<string, string>;
  data: any;
}
