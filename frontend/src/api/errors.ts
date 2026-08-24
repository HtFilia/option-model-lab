export class ApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ApiUnavailableError extends ApiError {}

export class ApiProtocolError extends ApiError {}

export class ApiResponseError extends ApiError {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
