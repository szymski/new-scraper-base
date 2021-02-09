import "reflect-metadata";
import { HttpClient } from "../scraper/http-client/http-client";
import { NodeFetchPerformer } from "../scraper/http-client/performers/node-fetch-performer";
import { Entrypoint } from "../scraper/robot/entrypoint";
import { Parallel, parallel } from "../scraper/robot/parallel";
import { ProgressTracker } from "../scraper/robot/progress-tracker";
import { Robot } from "../scraper/robot/robot";
import { getCurrentScope, Scope, ScopeParam } from "../scraper/robot/scope";

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
      const scope = getCurrentScope();
      setInterval(() => {
        const progress = Parallel.getRootProgress(scope);
        if (progress) {
          console.log(ProgressTracker.renderProgressTree(progress));
        }
        // const remap = (progress: ScopeProgress): ScopeProgress => {
        //   return {
        //     parent: (progress.parent?.tracker.status
        //       .name as any) as ScopeProgress,
        //     tracker: (progress.tracker.status.name as any) as ProgressTracker,
        //     children: progress.children.map((x) => remap(x)),
        //   };
        // };
        // Logger.error(remap(progress!));
      }, 1_000);

      const $ = await this.client.get("https://stare.e-gry.net/").cheerio();
      const categoryUrls = $("#menulewe .pod:nth-child(10) a")
        .toArray()
        .map((x) => $(x).attr("href")!);

      await parallel()
        .setLimit(4)
        .forEach(categoryUrls, async (url) => {
          await this.scrapCategory(url);
        });
    });
  }

  @Scope("category")
  private async scrapCategory(@ScopeParam("url") url: string) {
    // await parallel.while(1, async (page) => {
    //   return await this.scrapCategoryPage(url, page);
    // });

    await parallel()
      .setLimit(4)
      .for(1, 16, async (page) => {
        await this.scrapCategoryPage(url, page);
      });

    // for (let page = 1; page < 15; page++) {
    //   if (!(await this.scrapCategoryPage(url, page))) {
    //     return;
    //   }
    // }
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

    await parallel()
      .setLimit(4)
      .forEach(gameUrls, async (element) => {
        await this.scrapGame(url);
      });

    // for (const url of gameUrls) {
    //   await this.scrapGame(url);
    // }

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
  // Logger.info(output);
};
run.start().then();
