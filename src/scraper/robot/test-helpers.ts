import { getCurrentScope } from "./scope";
import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/root-scope-context";
import { ScopeContext } from "./scope/scope-context";
import { getScopeStorage } from "./scope/storage";

/**
 * Initializes a root scope and runs given function with it.
 */
export function mockRootScope(fn: (scope: RootScopeContext) => void) {
  let rootScope: RootScopeContext;
  rootScope = RootScopeContext.create("MOCK");
  runWithInitialScope(() => fn(rootScope), rootScope);
}

/**
 * Inherits a scope and runs the given function with it.
 */
export function mockScope(fn: (scope: ScopeContext) => void) {
  const currentScope = getCurrentScope();
  const scope = ScopeContext.inherit(currentScope, "TEST", "");
  return getScopeStorage().run(scope, () => fn(scope));
}

export function sleepAsync(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
