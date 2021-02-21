import * as fs from "fs";
import { Logger } from "../../../util/logger";
import { RootScopeContext } from "../../scope/root-scope-context";
import { ScopeContext } from "../../scope/scope-context";
import { FeatureConfiguration } from "../configuration";
import { Feature } from "../feature-class";

export class CheckpointContainer {
  constructor(
    private readonly feature: CheckpointFeature,
    readonly uniqueId: string
  ) {}

  async runForItem(item: any, fn: () => Promise<any>) {
    const checkpointItemId = `${this.uniqueId}[${JSON.stringify(item)}]`;

    if (this.feature.isFinished(checkpointItemId)) {
      // Logger.warn(`Skipping ${checkpointItemId}`);
    } else {
      this.feature.checkpointUniqueId.value = checkpointItemId;
      const result = await fn();
      this.feature.checkpointUniqueId.value = this.uniqueId;
      this.feature.markItemAsFinished(checkpointItemId);
      return result;
    }
    // TODO: Error handling
  }
}

export class CheckpointFeature extends Feature {
  createCheckpointContainer(scope: ScopeContext): CheckpointContainer {
    const index = this.getAndIncrementLocalIndex(scope);
    const uniqueId = this.initializeUniqueId(scope, index);

    return new CheckpointContainer(this, uniqueId);
  }

  private getAndIncrementLocalIndex(scope: ScopeContext) {
    return this.checkpointLocalIndex.value!++;
  }

  private initializeUniqueId(scope: ScopeContext, index: number) {
    const parentUniqueId = this.checkpointUniqueId.parentValue;
    const uniqueId = `${parentUniqueId ? `${parentUniqueId}.` : ""}${
      scope.name
    }[${index}]`;
    this.checkpointUniqueId.value = uniqueId;
    return uniqueId;
  }

  markItemAsFinished(checkpointItemId: string) {
    const checkpoints = this.checkpoints.value!;

    const withChildrenRemoved = checkpoints.filter(
      (key) => !key.startsWith(checkpointItemId)
    );

    withChildrenRemoved.push(checkpointItemId);

    this.checkpoints.value = withChildrenRemoved;
    this.checkpoints.value = withChildrenRemoved;

    this.onCheckpointUpdate.invoke(withChildrenRemoved);
  }

  isFinished(itemUniqueId: string) {
    const checkpoints = this.checkpoints.value!;
    return checkpoints.some((key) => key === itemUniqueId);
  }

  onCheckpointUpdate = this.createCallback<(checkpoints: string[]) => void>();

  checkpointUniqueId = this.createScopeVariable<string>("CheckpointUniqueId");

  checkpointLocalIndex = this.createLocalScopeVariable<number>(
    "CheckpointLocalIndex",
    () => 0
  );

  //#region Checkpoint restoring

  /**
   * Uses file of a given name to automatically read and save checkpoints.
   */
  init_useFile(config: FeatureConfiguration, filename: string) {
    this.checkpointsFilename.setValue(config, filename);
    this.init_restoreFromFile(config, filename);
  }

  init_restoreFromFile(config: FeatureConfiguration, filename: string) {
    if (fs.existsSync(filename)) {
      Logger.verbose(`Restoring checkpoints from '${filename}' file`);
      const contents = fs.readFileSync(filename, "utf-8");
      const checkpoints: string[] = JSON.parse(contents);
      this.init_restore(config, checkpoints);
    }
  }

  init_restore(config: FeatureConfiguration, checkpoints: string[]) {
    this.checkpointsToRestore.setValue(config, checkpoints);
  }

  onRootScopeEnter(scope: RootScopeContext) {
    const toRestore = this.checkpointsToRestore.value;
    if (toRestore?.length) {
      Logger.verbose(
        `A list of ${toRestore.length} checkpoints was provided. Using restored progress.`
      );
      this.checkpoints.value = toRestore;
    }
  }

  onScopeExit(scope: ScopeContext) {
    if(scope instanceof RootScopeContext) {
      const filename = this.checkpointsFilename.value;
      if(filename) {
        Logger.verbose(`Saving checkpoints to ${filename}`);
        const serialized = JSON.stringify(this.checkpoints.value, null, "\t");
        fs.writeFileSync(filename, serialized);
      }
    }
  }

  private checkpointsFilename = this.createInitialVariable<string>(
    "CheckpointsFile"
  );

  private checkpointsToRestore = this.createInitialVariable<string[]>(
    "CheckpointsToRestore"
  );

  checkpoints = this.createOutputVariable<string[]>("Checkpoints", () => []);

  //#endregion
}
