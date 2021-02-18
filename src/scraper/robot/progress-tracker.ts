import dateFormat from "dateformat";
import { TreeNode } from "./feature/descriptors/scope-data-tree-descriptor";

export interface ProgressTrackerOptions {
  start: number;
  max?: number;
  name?: string;
  onUpdate?: (tracker: ProgressTracker) => void;
}

interface ProgressTrackerStatus {
  finished: boolean;
  name?: string;
  start: number;
  max?: number;
  current: number;
  elapsed: number;
  percentage?: number;
  eta?: number;
  perSecond: number;
}

export class ProgressTracker {
  startDate = new Date();
  finished = false;
  current: number;

  constructor(private options: ProgressTrackerOptions) {
    this.current = options.start;
    if (this.options.onUpdate) {
      this.options.onUpdate(this);
    }
  }

  increase(value?: number) {
    this.current += value ?? 1;
    if (this.options.onUpdate) {
      this.options.onUpdate(this);
    }
  }

  finish() {
    this.finished = true;
    if (this.options.onUpdate) {
      this.options.onUpdate(this);
    }
  }

  get status(): ProgressTrackerStatus {
    const elapsed = (new Date().getTime() - this.startDate.getTime()) * 0.001;
    const totalItems = this.options.max
      ? this.options.max - this.options.start
      : undefined;
    const percentage =
      this.options.max && totalItems
        ? (this.current - this.options.start) / totalItems
        : undefined;
    const eta = percentage
      ? (elapsed / percentage) * (1 - percentage)
      : undefined;
    const perSecond = (this.current - this.options.start) / elapsed;

    return {
      name: this.options.name,
      finished: this.finished,
      start: this.options.start,
      max: this.options.max,
      current: this.current,
      percentage,
      eta,
      elapsed,
      perSecond,
    };
  }

  static renderProgressTree(node: TreeNode<ProgressTracker>, depth = 0) {
    let str = "";

    if (node.data) {
      str += `${"\t".repeat(depth)}${
        node.data ? this.renderProgressbar(node.data) : "NULL"
      }\n`;
      depth++;
    }

    for (const child of node.children) {
      str += ProgressTracker.renderProgressTree(child, depth);
    }

    return str;
  }

  static renderProgressbar(tracker: ProgressTracker) {
    const status = tracker.status;

    let str = "";
    const width = 40;

    str += status.name ? `${status.name} ` : "";
    str += `${status.current - status.start}/${
      status.max ? status.max - status.start : "?"
    } `;
    str += "[";

    const finishedWidth =
      status.percentage != null ? (width - 2) * status.percentage : null;
    for (let i = 0; i < width - 2; i++) {
      if (finishedWidth != null) {
        str += i < finishedWidth ? "█" : ".";
      } else {
        str += "?";
      }
    }

    str += "] ";

    str += `${status.perSecond.toFixed(2)}/s`;

    str += `, Elapsed: ${dateFormat(status.elapsed * 1_000, "MM:ss")}s`;

    if (status.eta) {
      str += `, ETA: ${dateFormat(status.eta * 1_000, "MM:ss")}s`;
    }

    return str;
  }
}
