import { Robot } from "../robot";

export interface ScopeContext {
  root: RootScopeContext;
  parent: ScopeContext | null;
  name: string;
  executionName: string;
  startDate: Date;
  endDate?: Date;
  totalDuration?: number;
}

export interface RootScopeContext extends ScopeContext {
  robot: Robot;
  callbacks: ScopeCallbacks;
}

export interface ScopeCallbacks {
  onDataReceived(type: string, data: any): void;
}
