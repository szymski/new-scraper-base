import { Feature } from "../feature-class";
import { ScopeContext } from "../../scope/scope-context";
import { Logger } from "../../../util/logger";

export class ConditionFeature extends Feature {
  async verifyAndSatisfyCondition(scope: ScopeContext, name: string) {
    const conditionMethod = scope.root.robot.getCondition(name);

    if(this.verifiedConditions.value!.has(name)) {
      return;
    }

    Logger.verbose(`Verifying condition '${name}'`);
    let ok = await conditionMethod.verify();

    if(!ok) {
      Logger.verbose(`Condition '${name}' not verified, attempting to satisfy`);

      await conditionMethod.satisfy();
      ok = await conditionMethod.verify();

      if(!ok) {
        throw new Error(`Failed to satisfy condition '${name}'`);
      }

      Logger.verbose(`Condition '${name}' satisfied successfully`);
      this.verifiedConditions.value!.add(name);
    }
  }

  verifiedConditions = this.createScopeRootVariable<Set<string>>(
    "VerifiedConditions",
    () => new Set()
  );
}
