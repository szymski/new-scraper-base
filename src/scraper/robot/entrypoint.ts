import { AsyncLocalStorage } from "async_hooks";
import {
  addClassMetadata,
  ClassMetadataKeys,
  EntrypointMetadata,
} from "./metadata-helpers";

// TODO: Clean this mess, WTF, what did I do, lol

interface EntrypointContext {
  name: string;
}

const entrypointStorage = new AsyncLocalStorage<EntrypointContext>();

export function Entrypoint(name?: string) {
  return <T extends number | any>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
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

    descriptor.writable = false;
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
