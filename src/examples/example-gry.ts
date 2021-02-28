import { AbortedException } from "../scraper/exceptions";
import { HttpClient } from "../scraper/http-client/http-client";
import { NodeFetchPerformer } from "../scraper/http-client/performers/node-fetch-performer";
import { Entrypoint, Robot, scope, Scope, ScopeParam } from "../scraper/robot";
import {
  CheckpointFeature,
  ProgressFeature,
} from "../scraper/robot/feature/features";
import { defineOutputData } from "../scraper/robot/feature/features/data";
import { parallel } from "../scraper/robot/parallel";
import { findPageCount } from "../scraper/robot/util/find-page-count";
import { Logger } from "../scraper/util/logger";

// Interface of the data we will be returning from our robot
interface GameData {
  name: string;
  category: string;
}

// We define a new Feature object through which we will return GameData objects
// Such construction will allow separation of returned data types and makes code completion work
const GameDataFeature = defineOutputData<GameData>();

class TestRobot extends Robot {
  private client = new HttpClient(new NodeFetchPerformer());

  constructor() {
    super();
    this.client.config.baseUrl = "https://stare.e-gry.net/";
    this.client.config.responseEncoding = "iso-8859-2";
  }

  @Entrypoint()
  scrapAllCategories() {
    return this.entrypoint<{ game: GameData }>(async () => {
      // We first get a list of all categories
      const $ = await this.client.get("https://stare.e-gry.net/").cheerio();
      const categoryUrls = $("#menulewe .pod:nth-child(10) a")
        .toArray()
        .map((x) => $(x).attr("href")!);

      // Parallel is an object which should be used every time we iterate through something
      // It supports automatic progress tracking, checkpoint saving and concurrency
      await parallel().forEach(categoryUrls, async (url) => {
        await this.scrapCategory(url);
      });
    });
  }

  @Scope("category")
  private async scrapCategory(@ScopeParam("url") url: string) {
    // Total page count is unknown on this website and in order to show a progress bar,
    // we have to use a helper method for guessing page count using binary search.
    // We only have to implement a method which returns a boolean value indicating
    // whether a given page number contains any elements. The helper does the rest.
    const pageCount = await findPageCount((page) =>
      this.pageHasItems(url, page)
    );

    // Now that we know the page count, we can simply use parallel for method
    // Here we set concurrency limit to 4, to perform 4 requests at the same time
    await parallel()
      .setLimit(4)
      .for(1, pageCount + 1, async (page) => {
        return await this.scrapCategoryPage(url, page);
      });

    // Alternatively, countWhile can be used when we don't know the page number
    // Keep in mind that in this case, the progress bar won't be shown at all
    // or its max value will be changing dynamically.
    // For countWhile, the callback has to return a boolean indicating whether
    // there are any items on the page or a number indicating how many pages there are.
    if (void false) {
      await parallel().countWhile(1, async (page) => {
        return await this.scrapCategoryPage(url, page);
      });
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

    // Get page count for the second method, using countWhile
    const maxPage = Number(
      $(".pages:last-child")
        .text()
        .match(/([0-9]+)(,|\s|>)+?$/)![1]
    );

    // Scrap each game
    await parallel().forEach(gameUrls, async (url) => {
      await this.scrapGame(url);
    });

    // Return max page count for countWhile method, this is not required by for loop
    return gameUrls.length > 0 ? maxPage : false;
  }

  @Scope("game")
  private async scrapGame(@ScopeParam("url") url: string) {
    const $ = await this.client.get(url).cheerio();

    // Prepare output data
    const game: GameData = {
      name: $("h1").text(),
      category: $(".left > a:nth-of-type(2)").text(),
    };

    // Report output data using the custom feature class we defined earlier
    scope.feature(GameDataFeature).reportData(game);
  }

  private async pageHasItems(url: string, page: number) {
    const $ = await this.client.get(`${url}/${page}`).cheerio();
    const gameUrls = $("#kategoria h2 a")
      .toArray()
      .map((x) => $(x).attr("href")!);
    return gameUrls.length > 0;
  }
}

// Create instance of a robot
const test = new TestRobot();
// Prepare a run by calling an entrypoint
const run = test.scrapAllCategories();

// Enable automatic progress saving and restoring
run.feature(CheckpointFeature).useFile("checkpoints.json");
// Enable progress bar logging
run.feature(ProgressFeature).enableLogging();

// Listen to received GameData objects using our custom feature
run.feature(GameDataFeature).callbacks.onDataReceived = (data) => {
  console.log(data);
};

// Robots have different callbacks in their lifetime
run.callbacks.onFinished = () => {
  Logger.info("onFinished");
};

// Runs the robot until it finishes
// By default, CTRL + C will cancel the job and save checkpoints to a file
run
  .start()
  .catch((e) => {
    // Only log exceptions, when their cause isn't a cancellation
    if (!(e instanceof AbortedException)) {
      Logger.error(e);
    }
  })
  .then();
