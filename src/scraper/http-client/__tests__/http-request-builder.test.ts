import {HttpClient} from "../http-client";
import {HttpRequestPerformer, HttpRequestPerformInput, HttpRequestPerformOutput} from "../http-request-performer";

describe("HttpRequestBuilder", () => {
  describe("Perform and parse", () => {
    const mockPerformer = (data: any): HttpRequestPerformer => {
      return {
        async perform(input: HttpRequestPerformInput): Promise<HttpRequestPerformOutput> {
          return {
            data,
          };
        },
      };
    };

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
});
