import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '@aio-storage/shared';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      const errorMessage = error.errors
        ?.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ') || 'Validation failed';
      
      next(new AppError(400, errorMessage));
    }
  };
};

