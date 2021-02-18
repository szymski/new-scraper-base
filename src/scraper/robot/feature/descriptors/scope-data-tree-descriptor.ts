import { getCurrentScope } from "../../scope";

/*
  Root context is always present, value is optional.
*/

export class ScopeDataTree<T> {
  readonly dataKey: symbol;

  constructor(name?: string) {
    this.dataKey = Symbol(name);
  }

  wrapWithNode<TReturn>(fn: (node: TreeNode<T>) => TReturn) {
    const node = this.createNode();
    return Promise.resolve(fn(node)).finally(() => {
      this.destroyNode(node);
    });
  }

  /**
   * Gets node assigned to current scope or undefined if no node.
   */
  getOrCreateLocalNode(): TreeNode<T> {
    const node = getCurrentScope().getLocal<TreeNode<T>>(this.dataKey);
    if (node) {
      return node;
    } else {
      return this.createNode();
    }
  }

  createNode(): TreeNode<T> {
    const scope = getCurrentScope();
    const currentNode = this.getNode();

    const newNode: TreeNode<T> = {
      scope: scope.fullExecutionName,
      children: [],
    };
    currentNode.children.push(newNode);

    scope.set(this.dataKey, newNode);

    return newNode;
  }

  destroyNode(node: TreeNode<T>) {
    const scope = getCurrentScope();

    scope.set(this.dataKey, undefined);

    const parentNode = this.getNode();
    parentNode.children = parentNode.children.filter((child) => child !== node);
  }

  /**
   * Gets current node.
   * Will return parent node, if no node present in the current scope.
   */
  getNode(): TreeNode<T> {
    let node = getCurrentScope().get<TreeNode<T>>(this.dataKey);
    if (!node) {
      return this.getRootNode();
    }
    return node;
  }

  /**
   * Gets node assigned to current scope or undefined if no node.
   */
  getLocalNode(): TreeNode<T> | undefined {
    return getCurrentScope().getLocal<TreeNode<T>>(this.dataKey);
  }

  /**
   * Returns top-level node of the root scope context.
   * If it doesn't exist, creates it.
   */
  getRootNode(): TreeNode<T> {
    const rootScope = getCurrentScope().root;
    let rootNode = rootScope.get<TreeNode<T>>(this.dataKey);
    if (!rootNode) {
      rootNode = {
        scope: rootScope.fullExecutionName,
        children: [],
      };
      rootScope.set<TreeNode<T>>(this.dataKey, rootNode);
    }
    return rootNode!;
  }
}

export interface TreeNode<T> {
  scope: string;
  data?: T;
  children: TreeNode<T>[];
}
