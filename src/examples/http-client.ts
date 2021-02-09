import { HttpClient } from "../scraper/http-client/http-client";
import { httpBasicAuthInterceptor } from "../scraper/http-client/interceptors/http-basic-auth.interceptor";
import { NodeFetchPerformer } from "../scraper/http-client/performers/node-fetch-performer";

async function run() {
  // Initialize HTTP client with node-fetch backend
  const http = new HttpClient(new NodeFetchPerformer());

  // Configuration for all requests can be set
  http.config.baseUrl = "https://reqres.in/api";

  // Requests can be built, sent and parsed in a method call chain
  const text = await http.get("/users").text();
  console.log("Text:", text);

  // You can also parse a JSON object
  const json = await http.get("/users").json<{ page: number }>();
  console.log("Page:", json.page);

  // ... or HTML with Cheerio
  const $ = await http.get("https://steamcommunity.com/id/szymski/").cheerio();
  console.log("HTML text:", $(".header_real_name bdi").text());

  // Configuration parameters and body can also be included in a single request
  const { page } = await http
    .get("/users")
    .add.urlParam("page", 2)
    .add.header("authorization", "bearer 123")
    .json<{ page: number }>();
  console.log("Page:", page);

  // Interceptors can be used to alter requests before performing them
  await http
    .get("/users")
    .add.interceptor(httpBasicAuthInterceptor("user", "password"))
    .void();
}

run().then();
