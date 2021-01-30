import {HttpClientConfig} from "../http-client-config";

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
        "param1": 1,
        "param2": "2"
      });
      expect(config.urlParams.get("param1")).toEqual("1");
      expect(config.urlParams.get("param2")).toEqual("2");
    });

    // TODO: Cookies
  });

  test("Should clone", () => {
    const config: HttpClientConfig = new HttpClientConfig();
    config.baseUrl = "base";
    config.add.header("h1", "test");
    config.add.header("h2", "test2");
    config.add.urlParam("p1", "param1");
    config.add.urlParam("p2", "param2");

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
  });

  test("Should concatenate 2 configs", () => {
    const config1: HttpClientConfig = new HttpClientConfig();
    config1.baseUrl = "base";
    config1.add.header("h1", "test");
    config1.add.header("h2", "test2");
    config1.add.urlParam("p1", "param1");
    config1.add.urlParam("p2", "param2");

    const config2: HttpClientConfig = new HttpClientConfig();
    config2.baseUrl = "overwritten";
    config2.add.header("h2", "overwritten");
    config2.add.urlParam("p1", "overwritten");

    const concatenated = HttpClientConfig.concat(config1, config2);

    expect(concatenated.baseUrl).toEqual("overwritten");

    expect(concatenated.headers).toEqual({
      h1: "test",
      h2: "overwritten",
    });

    expect(concatenated.urlParams.get("p1")).toEqual("overwritten");
    expect(concatenated.urlParams.get("p2")).toEqual("param2");

    // TODO: Cookies
  });
});
