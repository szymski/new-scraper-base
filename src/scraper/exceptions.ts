import { ScopeContext } from "./robot/scope/scope-context";

export class AbortedException extends Error {
  constructor() {
    super("Aborted");
  }
}

export class ScopeException extends Error {
  constructor(readonly scope: ScopeContext, readonly original: Error) {
    super(original.message);
  }
}
