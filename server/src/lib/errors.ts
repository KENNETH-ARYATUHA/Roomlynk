// A tiny custom error that carries an HTTP status code.
// Anywhere in a route we can write:  throw new HttpError(404, 'Room not found')
// and the error handler (middleware/errorHandler.ts) turns it into a clean
// JSON response. This keeps routes free of repetitive res.status(...).json(...).

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
