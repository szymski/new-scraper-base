import { AsyncLocalStorage } from "async_hooks";
import { ScopeContext } from "./scope-context";

const scopeStorage = new AsyncLocalStorage<ScopeContext>();

export function getScopeStorage() {
  return scopeStorage;
}

export function getCurrentScope(): ScopeContext {
  const scope = scopeStorage.getStore();
  if (!scope) {
    throw new Error("Attempted to get current scope outside a scope");
  }
  return scope;
}

export function getCurrentScopeNoFail(): ScopeContext | null {
  return scopeStorage.getStore() ?? null;
}
