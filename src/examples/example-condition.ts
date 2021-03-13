import { HttpClient } from "../scraper/http-client/http-client";
import { persistCookieInterceptor } from "../scraper/http-client/interceptors/persist-cookie.interceptor";
import { NodeFetchPerformer } from "../scraper/http-client/performers/node-fetch-performer";
import { Entrypoint, Robot, Scope } from "../scraper/robot";
import {
  Condition,
  ConditionMethods,
  UseCondition,
} from "../scraper/robot/condition";
import { Logger } from "../scraper/util/logger";

class TestRobot extends Robot {
  private client = new HttpClient(new NodeFetchPerformer());

  constructor() {
    super();
    this.client.config.baseUrl = "https://stare.e-gry.net/";
    this.client.config.responseEncoding = "iso-8859-2";
    this.client.config.add.interceptor(persistCookieInterceptor());
  }

  @Condition("must-be-logged-in", { verifyFirst: false })
  loginCondition(): ConditionMethods {
    return {
      verify: async () => {
        const $ = await this.client.get("/").cheerio();
        return !!$("#logmenu")
          .text()
          .match(/Wyloguj/i);
      },
      satisfy: async () => {
        const form = new URLSearchParams();
        form.set("back_url", "");
        form.set("login", "robottest");
        form.set("pass", "dupa123");
        form.set("submit", "OK");

        await this.client.post("/login").add.urlEncodedBody(form).void();
      },
    };
  }

  @Entrypoint()
  scrapAccountData() {
    return this.entrypoint(async () => {
      await this.accountData();
    });
  }

  @Scope()
  @UseCondition("must-be-logged-in")
  async accountData() {
    const $ = await this.client
      .get("https://stare.e-gry.net/log_panel.php")
      .cheerio();

    const table = $("#log > table:nth-child(3) tr")
      .toArray()
      .map((e) => [$(e).find("th").text(), $(e).find("td").text()]);

    Logger.info(table);
  }
}

const test = new TestRobot();
const run = test.scrapAccountData();

run.callbacks.onFinished = () => {
  Logger.info("onFinished");
};
run
  .start()
  .catch((e) => {
    Logger.error(e);
  })
  .then();
