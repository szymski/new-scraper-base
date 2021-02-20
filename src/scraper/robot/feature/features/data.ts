import { RootScopeContext } from "../../scope/root-scope-context";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class DataFeature extends Feature {
  onRootScopeEnter(scope: RootScopeContext) {
    // TODO: This is not a fancy solution, but it allows us to preserve returned data types.
    scope
      .getFeatureConfiguration(DataFeature)
      .assignCallback(this.onDataReceived.id, (type: string, data: any) => {
        scope.callbacks.onDataReceived(type, data);
      });
  }

  reportData(scope: ScopeContext, type: string, data: any) {
    this.onDataReceived.invoke(type, data);
  }

  onDataReceived = this.createCallback<(type: string, data: any) => void>();
}
