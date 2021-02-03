import { HttpClient } from "../http-client";
import {
  HttpRequestError,
  HttpRequestPerformer,
  HttpRequestPerformInput,
  HttpRequestPerformOutput,
} from "../http-request-performer";
import {HttpInvalidUrlException, HttpTimeoutException} from "../exceptions";

describe("HttpRequestBuilder", () => {
  const mockPerformer = (data?: any): HttpRequestPerformer => {
    return {
      async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
        return {
          success: true,
          data,
          headers: {},
          statusCode: 0,
        };
      },
    };
  };

  describe("Parse received data", () => {
    test("Should get text", async () => {
      const performer = mockPerformer("some text");
      const client = new HttpClient(performer);
      const res = await client.get("some_url").text();
      expect(res).toEqual("some text");
    });

    test("Should get json", async () => {
      const performer = mockPerformer("[1, 2, 3]");
      const client = new HttpClient(performer);
      const res = await client.get("some_url").json<number[]>();
      expect(res).toEqual([1, 2, 3]);
    });

    test("Should get buffer", async () => {
      const performer = mockPerformer(new Buffer("test"));
      const client = new HttpClient(performer);
      const res = await client.get("some_url").buffer();
      expect(res).toEqual(new Buffer("test"));
    });

    test("Should get cheerio", async () => {
      const performer = mockPerformer(new Buffer("<div class='asd'>text in div</div>>"));
      const client = new HttpClient(performer);
      const $ = await client.get("some_url").cheerio();
      expect($("div.asd").text()).toEqual("text in div");
    });
  });

  describe("Prepare perform input", () => {
    test("Should prepare get with null body", async () => {
      const performer = mockPerformer();
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.get("some_url").text();

      expect(performerSpy).toBeCalledWith({
        method: "get",
        url: "some_url",
        bodyType: "null",
        body: null,
        headers: {},
        cookies: expect.anything(),
        responseType: "text",
      });
    });

    test("Should prepare post with text body", async () => {
      const performer = mockPerformer();
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.post("some_url").add.body("this is the body").text();

      expect(performerSpy).toBeCalledWith({
        method: "post",
        url: "some_url",
        bodyType: "text",
        body: "this is the body",
        headers: {},
        cookies: expect.anything(),
        responseType: "text",
      });
    });

    test("Should prepare put with json body", async () => {
      const performer = mockPerformer();
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.put("some_url").add.jsonBody({ key: "value" }).text();

      expect(performerSpy).toBeCalledWith({
        method: "put",
        url: "some_url",
        bodyType: "text",
        body: JSON.stringify({ key: "value" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json; utf-8",
        }),
        cookies: expect.anything(),
        responseType: "text",
      });
    });

    test("Should prepare patch with accept json", async () => {
      const performer = mockPerformer("{}");
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.patch("some_url").json();

      expect(performerSpy).toBeCalledWith({
        method: "patch",
        url: "some_url",
        bodyType: "null",
        body: null,
        headers: expect.objectContaining({
          Accept: "application/json; utf-8",
        }),
        cookies: expect.anything(),
        responseType: "text",
      });
    });

    test("Should prepare delete with void response", async () => {
      const performer = mockPerformer("");
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.delete("some_url").void();

      expect(performerSpy).toBeCalledWith({
        method: "delete",
        url: "some_url",
        bodyType: "null",
        body: null,
        headers: {},
        cookies: expect.anything(),
        responseType: "void",
      });
    });

    describe("URL preparation", async () => {
      let spy: jest.SpyInstance;
      let client: HttpClient;

      beforeEach(() => {
        const performer = mockPerformer("");
        spy = jest.spyOn(performer, "perform");
        client = new HttpClient(performer);
      });

      test("Should keep empty url", async () => {
        client.config.baseUrl = "";
        await client.get("").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "",
          })
        );
      });

      test("Should not add base url if request url already has it", async () => {
        client.config.baseUrl = "http://test.com";
        await client.get("http://asd.com").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://asd.com",
          })
        );

        client.config.baseUrl = "http://test.com";
        await client.get("https://asd.com").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "https://asd.com",
          })
        );
      });

      test("Should add slash to base url if missing", async () => {
        client.config.baseUrl = "http://test.com";
        await client.get("asd").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/asd",
          })
        );

        client.config.baseUrl = "http://test.com/";
        await client.get("asd2").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/asd2",
          })
        );

        client.config.baseUrl = "http://test.com/";
        await client.get("/asd3").void();
        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/asd3",
          })
        );
      });

      test("Should add question mark if missing and params are included", async () => {
        await client.get("http://test.com").void();

        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com",
          })
        );

        await client.get("http://test.com").add.urlParam("param1", "value").void();

        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/?param1=value",
          })
        );

        await client.get("http://test.com/").add.urlParam("param1", "value").void();

        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/?param1=value",
          })
        );

        await client.get("http://test.com/?").add.urlParam("param1", "value").void();

        expect(spy).toBeCalledWith(
          expect.objectContaining({
            url: "http://test.com/?param1=value",
          })
        );
      });
    });
  });

  describe("Run interceptors", () => {
    test("Should run request interceptors", async () => {
      const performer = mockPerformer();
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);
      client.config.add.requestInterceptor(async (input) => {
        input.body = "intercepted";
        return input;
      });

      await client
        .get("some_url")
        .add.requestInterceptor(async (input) => {
          input.body += "123";
          return input;
        })
        .text();

      expect(performerSpy).toBeCalledWith(
        expect.objectContaining({
          body: "intercepted123",
        })
      );
    });

    test("Should run response interceptors", async () => {
      const performer = mockPerformer("original");

      const client = new HttpClient(performer);
      client.config.add.responseInterceptor(async (output, config) => {
        if (output.success) output.data += "1";
        return output;
      });

      const res = await client
        .get("some_url")
        .add.responseInterceptor(async (output, config) => {
          if (output.success) output.data += "2";
          return output;
        })
        .text();

      expect(res).toEqual("original12");
    });
  });

  describe("Exception handling", () => {
    test("Should throw timeout exception when performer times out", async () => {
      const performer: HttpRequestPerformer = {
        async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
          return {
            success: false,
            errorCode: HttpRequestError.Timeout,
          };
        },
      };

      const client = new HttpClient(performer);

      const t = () => client.get("test").void();

      await expect(t())
        .rejects
        .toThrow(HttpTimeoutException);
    });

    test("Should throw invalid url exception", async () => {
      const performer: HttpRequestPerformer = {
        async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
          return {
            success: false,
            errorCode: HttpRequestError.InvalidUrl,
          };
        },
      };

      const client = new HttpClient(performer);

      const t = () => client.get("test").void();

      await expect(t())
        .rejects
        .toThrow(HttpInvalidUrlException);
    });
  });
});
