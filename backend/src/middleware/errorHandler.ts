import { Request, Response, NextFunction } from 'express';

// Must have 4 params for Express to recognize this as an error handler,
// even though `next` is unused.
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
}
