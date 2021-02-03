import { HttpResponse } from "./http-request-builder";

export class HttpException extends Error {
  constructor(message?: string) {
    super(message ?? "Unknown error");
  }
}

export class HttpResponseException extends Error {
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

export class HttpAddressNotFoundException extends HttpException {
  constructor(message?: string) {
    super(message ?? "Address not found");
  }
}

export class HttpNotFoundException<T> extends HttpResponseException {
  constructor(public response: HttpResponse<T>) {
    super("Not found");
  }
}

export class HttpForbiddenException<T> extends HttpResponseException {
  constructor(public response: HttpResponse<T>) {
    super("Forbidden");
  }
}

export class HttpUnauthorizedException<T> extends HttpResponseException {
  constructor(public response: HttpResponse<T>) {
    super("Unauthorized");
  }
}
