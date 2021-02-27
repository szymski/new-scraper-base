import { getCurrentScope } from "../scope";
import { ScopeContext } from "../scope/scope-context";

/**
 * Refers to root scope of current execution context.
 */
export const rootScope: ScopeContext = null!;

/**
 * Refers to current execution context.
 */
export const scope: ScopeContext = null!;

function declareModuleProperty(name: string, get: () => any) {
  Object.defineProperty(module.exports, name, {
    get,
  });
}

declareModuleProperty("rootScope", () => getCurrentScope().root);
declareModuleProperty("scope", () => getCurrentScope());
