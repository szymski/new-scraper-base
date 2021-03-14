import { AsyncLocalStorage } from "async_hooks";
import {
  addClassMetadata,
  ClassMetadataKeys,
  EntrypointMetadata,
  getScopeConditions,
  UseConditionMetadata,
} from "./metadata-helpers";

export interface EntrypointContext {
  name: string;
  usedConditions: UseConditionMetadata[];
}

const entrypointStorage = new AsyncLocalStorage<EntrypointContext>();

export function Entrypoint(name?: string): MethodDecorator {
  return <T extends number | any>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
    const metadata: EntrypointMetadata = {
      name: name ?? propertyKey.toString(),
      methodName: propertyKey.toString(),
    };
    addClassMetadata(target, ClassMetadataKeys.EntrypointMethods, metadata);

    const original: any = descriptor.value;

    descriptor.value = function (this: any, ...params: any[]) {
      const usedConditions = getScopeConditions(target, propertyKey);

      const context: EntrypointContext = {
        name: name ?? propertyKey.toString(),
        usedConditions,
      };

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
