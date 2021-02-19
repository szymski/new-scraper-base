import { Logger } from "../../../util/logger";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class CheckpointContainer {
  constructor(
    private readonly feature: CheckpointFeature,
    readonly uniqueId: string
  ) {}

  async runForItem(item: any, fn: () => Promise<any>) {
    const checkpointItemId = `${this.uniqueId}[${JSON.stringify(item)}]`;

    if (this.feature.isFinished(checkpointItemId)) {
      Logger.warn(`Skipping ${checkpointItemId}`);
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
    const checkpoints = this.checkpointList.value!;

    const withChildrenRemoved = checkpoints.filter(
      (key) => !key.startsWith(checkpointItemId)
    );

    withChildrenRemoved.push(checkpointItemId);

    this.checkpointList.value = withChildrenRemoved;

    this.onCheckpointUpdate.invoke(withChildrenRemoved);
  }

  isFinished(itemUniqueId: string) {
    const checkpoints = this.checkpointList.value!;
    return checkpoints.some((key) => key === itemUniqueId);
  }

  restoreCheckpoints(scope: ScopeContext, list: string[]) {
    Logger.verbose("Restoring checkpoint list");
    this.checkpointList.value = list;
    // TODO
  }

  onCheckpointUpdate = this.createCallback<(checkpoints: string[]) => void>();

  checkpointList = this.createScopeRootVariable<string[]>(
    "CheckpointList",
    () => []
  );

  checkpointUniqueId = this.createScopeVariable<string>("CheckpointUniqueId");

  checkpointLocalIndex = this.createLocalScopeVariable<number>(
    "CheckpointLocalIndex",
    () => 0
  );
}
