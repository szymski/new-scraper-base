import {HttpClient} from "../http-client";
import {HttpRequestPerformer, HttpRequestPerformInput, HttpRequestPerformOutput} from "../http-request-performer";

describe("HttpRequestBuilder", () => {
  const mockPerformer = (data?: any): HttpRequestPerformer => {
    return {
      async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
        return {
          data,
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

      await client.post("some_url")
        .add.body("this is the body")
        .text();

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

      await client.put("some_url")
        .add.jsonBody({key: "value"})
        .text();

      expect(performerSpy).toBeCalledWith({
        method: "put",
        url: "some_url",
        bodyType: "text",
        body: JSON.stringify({key: "value"}),
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

      await client.patch("some_url")
        .json();

      expect(performerSpy).toBeCalledWith({
        method: "patch",
        url: "some_url",
        bodyType: "null",
        body: null,
        headers: expect.objectContaining({
          "Accept": "application/json; utf-8",
        }),
        cookies: expect.anything(),
        responseType: "text",
      });
    });

    test("Should prepare delete with void response", async () => {
      const performer = mockPerformer("");
      const performerSpy = jest.spyOn(performer, "perform");

      const client = new HttpClient(performer);

      await client.delete("some_url")
        .void();

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
        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "",
          }));
      });

      test("Should add slash to base url if missing", async () => {
        client.config.baseUrl = "http://test.com";
        await client.get("asd").void();
        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/asd",
          }));

        client.config.baseUrl = "http://test.com/";
        await client.get("asd2").void();
        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/asd2",
          }));

        client.config.baseUrl = "http://test.com/";
        await client.get("/asd3").void();
        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/asd3",
          }));
      });

      test("Should add question mark if missing and params are included", async () => {
        await client.get("http://test.com")
          .void();

        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com",
          }));

        await client.get("http://test.com")
          .add.urlParam("param1", "value")
          .void();

        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/?param1=value",
          }));

        await client.get("http://test.com/")
          .add.urlParam("param1", "value")
          .void();

        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/?param1=value",
          }));

        await client.get("http://test.com/?")
          .add.urlParam("param1", "value")
          .void();

        expect(spy)
          .toBeCalledWith(expect.objectContaining({
            url: "http://test.com/?param1=value",
          }));
      });
    });
  });
});
