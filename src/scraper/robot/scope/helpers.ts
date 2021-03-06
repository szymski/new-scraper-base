import "reflect-metadata";
import { AbortedException, ScopeException } from "../../exceptions";
import { Feature } from "../feature";
import { ScopeParamMetadata, UseConditionMetadata } from "../metadata-helpers";
import { RootScopeContext } from "./root-scope-context";
import { ScopeContext } from "./scope-context";
import { getCurrentScopeNoFail, getScopeStorage } from "./storage";
import { ConditionFeature } from "../feature/features";

export function formatScopeParams(
  params: any[],
  paramsMetadata: ScopeParamMetadata[]
) {
  return paramsMetadata
    .sort((a, b) => (a.index - b.index > 0 ? 1 : -1))
    .map((meta) => `${meta.name}=${JSON.stringify(params[meta.index])}`)
    .join(",");
}

export function wrapWithScope<T extends (...params: any[]) => Promise<any>>(
  callback: T,
  name: string,
  paramsMetadata: ScopeParamMetadata[] = [],
  usedConditions: UseConditionMetadata[] = []
) {
  return function (this: any, ...params: any[]) {
    const currentScope = getCurrentScopeNoFail();
    if (!currentScope) {
      throw new Error(
        "Attempted to run scraper method without scope. You probably run a scraper method without an entrypoint. All scraping should start in a function marked with @Entrypoint()."
      );
    }

    if (currentScope.root.abortController.signal.aborted) {
      throw new AbortedException();
    }

    const scope = ScopeContext.inherit(
      currentScope,
      name,
      formatScopeParams(params, paramsMetadata)
    );
    return getScopeStorage().run(scope, async () => {
      // Only call callback on non-root scopes
      if (scope.parent) {
        Feature.runCallback("onScopeEnter", scope);
      }

      const conditionFeature = scope.feature(ConditionFeature);

      for (const condition of usedConditions) {
        await conditionFeature.verifyAndSatisfyCondition(condition.name);
      }

      // TODO: Clean this up

      // this?.onScopeStart(scope);
      return (
        // Promise.resolve is called here to ensure we always operate on a promise.
        // Without it, if scope didn't return a promise, the code would crash.
        Promise.resolve(callback.apply(this, params))
          .catch((e: any) => {
            if (e instanceof ScopeException) {
              Feature.runCallback("onScopeError", scope, e.scope, e);
              throw e;
            } else {
              Feature.runCallback("onScopeError", scope, scope, e);
              throw new ScopeException(scope, e);
            }
          })
          .then((result: any) => {
            scope.endDate = new Date();
            scope.totalDuration =
              scope.endDate.getTime() - scope.startDate.getTime();
            // this?.onScopeEnd(scope);

            // Only call callback on non-root scopes
            if (scope.parent) {
              Feature.runCallback("onScopeExit", scope);
            }

            return result;
          })
      );
    });
  };
}

export function runWithInitialScope<T extends (...params: any[]) => any>(
  fn: T,
  scope?: RootScopeContext
): ReturnType<T> {
  return getScopeStorage().run(scope ?? RootScopeContext.create(), fn);
}
