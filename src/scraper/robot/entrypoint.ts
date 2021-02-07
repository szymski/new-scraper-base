import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "../util/logger";
import { Robot } from "./robot";
import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/types";
import { OutputTypeUnion, RobotRun } from "./types";

interface EntrypointContext {
  name: string;
}

const entrypointStorage = new AsyncLocalStorage<EntrypointContext>();

export function Entrypoint(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const context: EntrypointContext = {
      name: name ?? propertyKey.toString(),
    };

    const original: any = descriptor.value;

    descriptor.value = function (this: any, ...params: any[]) {
      const robot = this;
      return entrypointStorage.run(context, () =>
        original.apply(robot, params)
      );
    } as any;
  };
}

export function getEntrypointContext() {
  const context = entrypointStorage.getStore();
  if (!context) {
    throw new Error(
      "Attempted to get entrypoint context outside an entrypoint. Did you forget to add @Entrypoint() decorator?"
    );
  }
  return context;
}

export function createEntrypointRun<TData, TReturn = any>(
  robot: Robot,
  fn: () => Promise<TReturn>
): RobotRun<TData, TReturn> {
  let run: RobotRun<TData, TReturn>;

  Logger.verbose(`Initialized entrypoint`);

  const scope: Partial<RootScopeContext> = {
    name: getEntrypointContext().name,
    robot: robot,
    callbacks: {
      onDataReceived(type: string, data: any) {
        run.callbacks.onDataReceived({
          type,
          data,
        } as OutputTypeUnion<TData>);
      },
    },
  };

  const start = async () => {
    Logger.verbose("Running entrypoint");
    const result = await runWithInitialScope(fn, scope);
    Logger.verbose("Robot action finished");
    return result;
  };

  run = {
    start,
    callbacks: {
      onDataReceived(data: OutputTypeUnion<TData>) {},
    },
  };

  return run;
}
