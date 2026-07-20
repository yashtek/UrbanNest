import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        errors: err.issues.map((issue) => issue.message),
      },
      400,
    );
  }
  // Custom App Error
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.statusCode as any,
    );
  }

  // Hono HTTP Exception
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.status as any,
    );
  }

  // Duplicate Key Error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];

    return c.json(
      {
        success: false,
        message: `${field} already exists`,
      },
      409,
    );
  }

  // JWT Errors
  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      401,
    );
  }

  // Unknown Error
  console.error(err);

  return c.json(
    {
      success: false,
      message: "Internal Server Error",
    },
    500,
  );
};
