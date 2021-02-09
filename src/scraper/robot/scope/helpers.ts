import "reflect-metadata";
import { ScopeParamMetadata } from "../metadata-helpers";
import { getCurrentScopeNoFail, getScopeStorage } from "./storage";
import { RootScopeContext, ScopeContext } from "./types";

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
    name: data.fullName ?? "ROOT",
    executionName: data.fullName ?? "ROOT",
    fullName: data.fullName ?? "ROOT",
    fullExecutionName: data.fullName ?? "ROOT",
    robot: data.robot!,
    startDate: new Date(),
    callbacks: {
      onDataReceived(type: string, data: any) {},
      ...(data.callbacks || {}),
    },
    data: {},
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
    name: name,
    executionName: `${name}(${formattedParams})`,
    fullName: `${parent.fullName}.${name}`,
    fullExecutionName: `${parent.fullExecutionName}.${name}(${formattedParams})`,
    startDate: new Date(),
    data: {
      ...parent.data,
    },
  };
}
