import { getCurrentScope } from "../scope";
import { Feature } from "./feature";

export class FeatureCallbackDescriptor<
  TCallbackFunc extends (...params: any) => any
> {
  readonly id = Symbol();

  constructor(private FeatureConstructor: new () => Feature) {}

  invoke(...params: Parameters<TCallbackFunc>): void {
    const scope = getCurrentScope();
    const config = scope.root.getFeatureConfiguration(
      this.FeatureConstructor
    );
    config.invokeCallback(this.id, scope, ...(params as any));
  }
}
