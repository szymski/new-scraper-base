import { HttpClientConfig } from "../http-client-config";
import {
  RequestInterceptorFunction,
  ResponseInterceptorFunction,
} from "../interceptors/interfaces";

describe("HttpClientConfig", () => {
  describe("Add params", () => {
    let config: HttpClientConfig;

    beforeEach(() => {
      config = new HttpClientConfig();
    });

    test("Should add header", () => {
      config.add.header("header", "value");
      expect(config.headers).toEqual({
        header: "value",
      });
    });

    test("Should add headers", () => {
      config.add.headers({
        header1: "1",
        header2: "header2",
      });
      expect(config.headers).toEqual({
        header1: "1",
        header2: "header2",
      });
    });

    test("Should add url param", () => {
      config.add.urlParam("param", "value");
      expect(config.urlParams.get("param")).toEqual("value");
    });

    test("Should add url params", () => {
      config.add.urlParams({
        param1: 1,
        param2: "2",
      });
      expect(config.urlParams.get("param1")).toEqual("1");
      expect(config.urlParams.get("param2")).toEqual("2");
    });

    // TODO: Cookies
  });

  test("Should clone", () => {
    const config: HttpClientConfig = new HttpClientConfig();
    config.baseUrl = "base";
    config.add.encoding("utf-8");
    config.add.header("h1", "test");
    config.add.header("h2", "test2");
    config.add.urlParam("p1", "param1");
    config.add.urlParam("p2", "param2");
    const requestInterceptor: RequestInterceptorFunction = async (
      input,
      _
    ) => {};
    const responseInterceptor: ResponseInterceptorFunction = async (
      output,
      _
    ) => {};
    config.add.requestInterceptor(requestInterceptor);
    config.add.responseInterceptor(responseInterceptor);

    const clone = config.clone();
    expect(clone).not.toBe(config);

    expect(clone.baseUrl).toEqual("base");

    expect(clone.headers).toEqual({
      h1: "test",
      h2: "test2",
    });

    expect(clone.urlParams.get("p1")).toEqual("param1");
    expect(clone.urlParams.get("p2")).toEqual("param2");

    // TODO: Cookies

    expect(clone.interceptors.request).toEqual([requestInterceptor]);
    expect(clone.interceptors.response).toEqual([responseInterceptor]);

    expect(clone.encoding).toEqual("utf-8");
  });

  test("Should concatenate 2 configs", () => {
    const requestInterceptor1: RequestInterceptorFunction = async (input, _) =>
      input;
    const requestInterceptor2: RequestInterceptorFunction = async (input, _) =>
      input;
    const responseInterceptor1: ResponseInterceptorFunction = async (
      output,
      _
    ) => output;
    const responseInterceptor2: ResponseInterceptorFunction = async (
      output,
      _
    ) => output;

    const config1: HttpClientConfig = new HttpClientConfig();
    config1.baseUrl = "base";
    config1.encoding = "utf8";
    config1.add.header("h1", "test");
    config1.add.header("h2", "test2");
    config1.add.urlParam("p1", "param1");
    config1.add.urlParam("p2", "param2");
    config1.add.requestInterceptor(requestInterceptor1);

    const config2: HttpClientConfig = new HttpClientConfig();
    config2.baseUrl = "overwritten";
    config2.encoding = "latin1";
    config2.add.header("h2", "overwritten");
    config2.add.urlParam("p1", "overwritten");
    config2.add.requestInterceptor(requestInterceptor2);
    config2.add.responseInterceptor(responseInterceptor1);
    config2.add.responseInterceptor(responseInterceptor2);

    const concatenated = HttpClientConfig.concat(config1, config2);

    expect(concatenated.baseUrl).toEqual("overwritten");
    expect(concatenated.encoding).toEqual("latin1");

    expect(concatenated.headers).toEqual({
      h1: "test",
      h2: "overwritten",
    });

    expect(concatenated.urlParams.get("p1")).toEqual("overwritten");
    expect(concatenated.urlParams.get("p2")).toEqual("param2");

    // TODO: Cookies

    expect(concatenated.interceptors.request).toEqual([
      requestInterceptor1,
      requestInterceptor2,
    ]);
    expect(concatenated.interceptors.response).toEqual([
      responseInterceptor1,
      responseInterceptor2,
    ]);
  });
});
