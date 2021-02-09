import { Robot } from "../robot";
import { ScopeCallbacks } from "./types";

export class ScopeContext {
  #root!: RootScopeContext;
  readonly parent!: ScopeContext | null;

  readonly name!: string;
  readonly fullName!: string;
  readonly executionName!: string;
  readonly fullExecutionName!: string;

  public data!: any;
  protected localData: any = {};

  protected constructor(data?: Partial<ScopeContext> & { data: any }) {
    Object.assign(this, data ?? {});
  }

  set root(value: RootScopeContext) {
    this.#root = value;
  }

  get root() {
    return this.#root;
  }

  startDate!: Date;
  endDate?: Date;
  totalDuration?: number;

  static inherit(parent: ScopeContext, name: string, formattedParams: string) {
    return new ScopeContext({
      root: parent.root,
      parent: parent,
      name,
      fullName: `${parent.fullName}.${name}`,
      executionName: `${name}(${formattedParams})`,
      fullExecutionName: `${parent.fullExecutionName}.${name}(${formattedParams})`,
      startDate: new Date(),
      data: {
        ...parent.data,
      },
    });
  }
}

export class RootScopeContext extends ScopeContext {
  readonly robot!: Robot;
  readonly callbacks: ScopeCallbacks = {
    onDataReceived(type: string, data: any) {},
  };

  protected constructor(data: Partial<RootScopeContext>) {
    super();
    Object.assign(this, data);
    this.data = {};
  }

  get root() {
    return this;
  }

  static create(name?: string, robot?: Robot) {
    return new RootScopeContext({
      robot,
      parent: null,
      name: name ?? "ROOT",
      executionName: name ?? "ROOT",
      fullName: name ?? "ROOT",
      fullExecutionName: name ?? "ROOT",
      startDate: new Date(),
    });
  }
}
