import { Logger } from "../../../util/logger";
import { ScopeContext } from "../../scope/scope-context";
import { Feature } from "../feature-class";

export class ConditionFeature extends Feature {
  async verifyAndSatisfyCondition(scope: ScopeContext, name: string) {
    const condition = scope.root.robot.getCondition(name);

    if (this.verifiedConditions.value!.has(name)) {
      return;
    }

    let ok = false;
    if (condition.options.verifyFirst !== false) {
      Logger.verbose(`Verifying condition '${name}'`);
      ok = await condition.methods.verify();
    }

    if (!ok) {
      if(condition.options.verifyFirst) {
        Logger.verbose(`Condition '${name}' not verified, attempting to satisfy`);
      }
      else {
        Logger.verbose(`Satisfying condition '${name}'`);
      }

      await condition.methods.satisfy();
      ok = await condition.methods.verify();

      if (!ok) {
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
