import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const createShortUrlSchema = z.object({
  longUrl: z.string().url({ message: 'longUrl must be a valid URL' }),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Generic validation middleware factory — takes a Zod schema and
 * validates req.body against it, short-circuiting with a 400 on failure.
 * This keeps validation logic out of controllers entirely.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}
