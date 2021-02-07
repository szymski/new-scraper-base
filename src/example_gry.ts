import "reflect-metadata";
import { HttpClient } from "./scraper/http-client/http-client";
import { NodeFetchPerformer } from "./scraper/http-client/performers/node-fetch-performer";
import { Entrypoint, Robot } from "./scraper/robot/robot";
import { Scope, ScopeParam } from "./scraper/robot/scope";
import { Logger } from "./scraper/util/logger";

interface GameData {
  name: string;
  category: string;
}

class TestRobot extends Robot {
  private client = new HttpClient(new NodeFetchPerformer());

  constructor() {
    super();
    this.client.config.baseUrl = "https://stare.e-gry.net/";
  }

  @Entrypoint()
  scrapAllCategories() {
    return this.entrypoint<{ game: GameData }>(async () => {
      const $ = await this.client.get("https://stare.e-gry.net/").cheerio();
      const categoryUrls = $("#menulewe .pod:nth-child(10) a")
        .toArray()
        .map((x) => $(x).attr("href")!);

      for (const url of categoryUrls) {
        await this.scrapCategory(url);
      }
    });
  }

  @Scope("category")
  private async scrapCategory(@ScopeParam("url") url: string) {
    for (let page = 1; ; page++) {
      if (!(await this.scrapCategoryPage(url, page))) {
        return;
      }
    }
  }

  @Scope("page")
  private async scrapCategoryPage(
    url: string,
    @ScopeParam("page") page: number
  ) {
    const $ = await this.client.get(`${url}/${page}`).cheerio();
    const gameUrls = $("#kategoria h2 a")
      .toArray()
      .map((x) => $(x).attr("href")!);

    for (const url of gameUrls) {
      await this.scrapGame(url);
    }

    return gameUrls.length > 0;
  }

  @Scope("game")
  private async scrapGame(@ScopeParam("url") url: string) {
    const $ = await this.client.get(url).cheerio();

    const game: GameData = {
      name: $("h1").text(),
      category: $(".left > a:nth-of-type(2)").text(),
    };

    this.onDataReceived("game", game);
  }
}

const test = new TestRobot();
const run = test.scrapAllCategories();
run.callbacks.onDataReceived = (output) => {
  Logger.info(output);
};
run.start().then();
