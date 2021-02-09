import { Robot } from "../robot";

export interface ScopeContext {
  root: RootScopeContext;
  parent: ScopeContext | null;
  name: string;
  executionName: string;
  fullName: string;
  fullExecutionName: string;
  startDate: Date;
  endDate?: Date;
  totalDuration?: number;
  data: Record<string, any>;
}

export interface RootScopeContext extends ScopeContext {
  robot: Robot;
  callbacks: ScopeCallbacks;
}

export interface ScopeCallbacks {
  onDataReceived(type: string, data: any): void;
}
