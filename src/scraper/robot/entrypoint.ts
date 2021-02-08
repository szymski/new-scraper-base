import { AsyncLocalStorage } from "async_hooks";
import { Logger } from "../util/logger";
import { Robot } from "./robot";
import { runWithInitialScope } from "./scope/helpers";
import { RootScopeContext } from "./scope/types";
import { OutputTypeUnion, RobotRun } from "./types";
import {addClassMetadata, ClassMetadataKeys, EntrypointMetadata} from "./metadata-helpers";

interface EntrypointContext {
  name: string;
}

const entrypointStorage = new AsyncLocalStorage<EntrypointContext>();

export function Entrypoint(name?: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const context: EntrypointContext = {
      name: name ?? propertyKey.toString(),
    };
    const metadata: EntrypointMetadata = {
      name: name ?? propertyKey.toString(),
      methodName: propertyKey.toString(),
    };
    addClassMetadata(target, ClassMetadataKeys.EntrypointMethods, metadata);

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
  const entrypointContext = getEntrypointContext();

  let run: RobotRun<TData, TReturn>;

  const scope: Partial<RootScopeContext> = {
    name: entrypointContext.name,
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
    Logger.verbose(`Running entrypoint ${entrypointContext.name}`);
    const result = await runWithInitialScope(fn, scope);
    Logger.verbose(`Robot action '${entrypointContext.name}' finished`);
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
