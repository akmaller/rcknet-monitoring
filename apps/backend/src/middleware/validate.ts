import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

const replaceObjectContents = (target: unknown, source: unknown) => {
  if (!target || typeof target !== 'object' || !source || typeof source !== 'object') {
    return;
  }

  Object.keys(target as Record<string, unknown>).forEach((key) => {
    delete (target as Record<string, unknown>)[key];
  });
  Object.assign(target as Record<string, unknown>, source as Record<string, unknown>);
};

const validate = (schema: ZodSchema, getter: (req: Request) => unknown, setter: (req: Request, data: unknown) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(getter(req));
    if (!result.success) {
      return res.status(400).json({
        error: 'ValidationError',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    setter(req, result.data);
    return next();
  };

export const validateBody = (schema: ZodSchema) =>
  validate(schema, (req) => req.body, (req, data) => {
    req.body = data as any;
  });

export const validateQuery = (schema: ZodSchema) =>
  validate(schema, (req) => req.query, (req, data) => {
    replaceObjectContents(req.query, data);
  });

export const validateParams = (schema: ZodSchema) =>
  validate(schema, (req) => req.params, (req, data) => {
    replaceObjectContents(req.params, data);
  });
