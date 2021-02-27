import { AbortedException } from "../scraper/exceptions";
import { HttpClient } from "../scraper/http-client/http-client";
import { NodeFetchPerformer } from "../scraper/http-client/performers/node-fetch-performer";
import { Entrypoint, Robot, Scope, ScopeParam } from "../scraper/robot";
import { CheckpointFeature, ProgressFeature } from "../scraper/robot/feature/features";
import { parallel } from "../scraper/robot/parallel";
import { findPageCount } from "../scraper/robot/util/find-page-count";
import { Logger } from "../scraper/util/logger";

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

      await parallel().forEach(categoryUrls, async (url) => {
        await this.scrapCategory(url);
      });
    });
  }

  @Scope("category")
  private async scrapCategory(@ScopeParam("url") url: string) {
    const pageCount = await findPageCount((page) =>
      this.pageHasItems(url, page)
    );

    await parallel()
      .setLimit(4)
      .for(1, pageCount + 1, async (page) => {
        return await this.scrapCategoryPage(url, page);
      });

    // await parallel().countWhile(1, async (page) => {
    //   return await this.scrapCategoryPage(url, page);
    // });
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

    const maxPage = Number(
      $(".pages:last-child")
        .text()
        .match(/([0-9]+)(,|\s|>)+?$/)![1]
    );

    await parallel().forEach(gameUrls, async (url) => {
      await this.scrapGame(url);
    });

    return gameUrls.length > 0 ? maxPage : false;
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

  private async pageHasItems(url: string, page: number) {
    const $ = await this.client.get(`${url}/${page}`).cheerio();
    const gameUrls = $("#kategoria h2 a")
      .toArray()
      .map((x) => $(x).attr("href")!);
    return gameUrls.length > 0;
  }
}

const test = new TestRobot();
const run = test.scrapAllCategories();

run.feature(CheckpointFeature).useFile("checkpoints.json");
run.feature(ProgressFeature).enableLogging();

run.callbacks.onDataReceived = (output) => {
  // Logger.info(output);
};

run.callbacks.onFinished = () => {
  Logger.info("onFinished");
};

run
  .start()
  .catch((e) => {
    if (!(e instanceof AbortedException)) {
      Logger.error(e);
    }
  })
  .then();
