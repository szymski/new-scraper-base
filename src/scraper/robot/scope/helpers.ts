import "reflect-metadata";
import { formatScopeParams, ScopeParamMetadata } from "../metadata-helpers";
import { getCurrentScopeNoFail, getScopeStorage } from "./storage";
import { RootScopeContext, ScopeContext } from "./types";

export function wrapWithScope<T extends (...params: any[]) => Promise<any>>(
  callback: T,
  name: string,
  paramsMetadata: ScopeParamMetadata[] = []
) {
  return function (this: any, ...params: any[]) {
    const currentScope = getCurrentScopeNoFail();
    if (!currentScope) {
      throw new Error(
        "Attempted to run scraper method without scope. You probably run a scraper method without an entrypoint. All scraping should start in a function marked with @Entrypoint()."
      );
    }

    const scope = inheritScope(
      currentScope,
      name,
      formatScopeParams(params, paramsMetadata)
    );
    return getScopeStorage().run(scope, () => {
      // TODO: Hooks
      // this?.onScopeStart(scope);
      return (
        callback
          .apply(this, params)
          // .catch((e: any) => {
          //   Logger.error(e);
          //   throw e;
          // })
          .then((result: any) => {
            scope.endDate = new Date();
            scope.totalDuration =
              scope.endDate.getTime() - scope.startDate.getTime();
            // this?.onScopeEnd(scope);
            return result;
          })
      );
    });
  };
}

export function runWithInitialScope<T extends (...params: any[]) => any>(
  fn: T,
  scope?: Partial<RootScopeContext>
): ReturnType<T> {
  return getScopeStorage().run(prepareInitialScope(scope ?? {}), fn);
}

function prepareInitialScope(
  data: Partial<RootScopeContext>
): RootScopeContext {
  const scope: RootScopeContext = {
    parent: null,
    root: null!,
    name: data.name ?? "ROOT",
    executionName: data.name ?? "ROOT",
    robot: data.robot!,
    startDate: new Date(),
    callbacks: {
      onDataReceived(type: string, data: any) {},
      ...(data.callbacks || {}),
    },
  };
  scope.root = scope;
  scope.parent = scope;
  return scope;
}

function inheritScope(
  parent: ScopeContext,
  name: string,
  formattedParams: string
): ScopeContext {
  return {
    root: parent.root,
    parent,
    name: `${parent.name}.${name}`,
    executionName: `${parent.executionName}.${name}(${formattedParams})`,
    startDate: new Date(),
  };
}
