import colors from "colors";
import { getCurrentScopeNoFail } from "../robot/scope";

export enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
  Verbose = "verbose",
}

const logLevelColor: Record<LogLevel, (str: string) => string> = {
  [LogLevel.Info]: colors.white,
  [LogLevel.Warn]: colors.yellow,
  [LogLevel.Error]: colors.red,
  [LogLevel.Verbose]: colors.grey,
};

export class Logger {
  log(level: LogLevel, message: any, color?: colors.Color) {
    const scope = getCurrentScopeNoFail();
    let result = "";

    result += colors.grey(new Date().toISOString());
    result += logLevelColor[level](` [${level.toUpperCase()}]`);
    if (scope) {
      result += colors.grey(` ${scope?.fullExecutionName ?? "global"}:`);
    }
    result += (color ?? logLevelColor[level])(
      ` ${this.formatMessage(message)}`
    );

    console.log(result);
  }

  private formatMessage(message: any) {
    if (message instanceof Error) {
      return `${(message as any).constructor.name} - ${
        message.message
      }\n${message.stack!.toString()}`;
    } else if (typeof message === "string") {
      return message.toString();
    } else {
      return JSON.stringify(message, null, 4);
    }
  }

  static info(message: any) {
    this.instance.log(LogLevel.Info, message);
  }

  static warn(message: any) {
    this.instance.log(LogLevel.Warn, message);
  }

  static error(message: any) {
    this.instance.log(LogLevel.Error, message);
  }

  static verbose(message: any) {
    this.instance.log(LogLevel.Verbose, message);
  }

  static color(color: colors.Color, message: any) {
    this.instance.log(LogLevel.Info, message, color);
  }

  static instance = new Logger();
}
