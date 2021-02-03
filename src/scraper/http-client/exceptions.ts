export class HttpException extends Error {

  constructor(message?: string) {
    super(message ?? "Unknown error");
  }
}

export class HttpTimeoutException extends HttpException {

  constructor(message?: string) {
    super(message ?? "Timed out");
  }
}

export class HttpInvalidUrlException extends HttpException {

  constructor(message?: string) {
    super(message ?? "Invalid URL");
  }
}
