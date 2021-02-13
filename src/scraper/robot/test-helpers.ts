import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/scope-context";

export function mockScope(fn: (scope: RootScopeContext) => void) {
  let rootScope: RootScopeContext;
  rootScope = RootScopeContext.create("MOCK");
  runWithInitialScope(() => fn(rootScope), rootScope);
}
