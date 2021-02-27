import { Inject } from "../../util/parameter-injector";
import { Feature as FeatureClass } from "../feature";
import { getCurrentScope } from "./storage";

// TODO: Optimize getCurrentScope calls. One solution is to pass context to provider function and getting values from it.

export function Context() {
  return Inject("scope", () => getCurrentScope());
}

export function RootContext() {
  return Inject("root-scope", () => getCurrentScope().root);
}

export function Feature<T extends FeatureClass>(Feature: new () => T) {
  return Inject(`feature-${Feature.name}`, () =>
    getCurrentScope().feature(Feature)
  );
}
