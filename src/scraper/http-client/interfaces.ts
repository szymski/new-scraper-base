import {Cookie, CookieJar} from "tough-cookie";
import {HttpClient} from "./http-client";

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


// const client: HttpClient = null!;
//
// //////////////////
//
// client.config
//   .add.header("authorization", "asdasd");
//
// client.config.headers = {};
//
//
// //////////////////
//
// client.get("dupa.pl")
//   .add.header("asd", "asd234234")
//   .add.urlParam("asdasdasd", "asdasdas")
//   .add.jsonBody({asd: 123})
//   .json();
//
// //////////////////

