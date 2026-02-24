import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().integer().min(1).max(65535).default(3000),

  // ── Database ────────────────────────────────────────────────────────────────
  DATABASE_TYPE: Joi.string()
    .valid('better-sqlite3', 'postgres')
    .default('better-sqlite3'),

  DATABASE_URL: Joi.string().required().messages({
    'any.required': '"DATABASE_URL" is required (path for SQLite, connection URL for PostgreSQL)',
  }),

  // ── JWT ─────────────────────────────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': '"JWT_SECRET" is required',
    'string.min': '"JWT_SECRET" must be at least 16 characters',
  }),

  CORS_ORIGIN: Joi.string().uri().default('http://localhost:4200'),

  JWT_EXPIRATION: Joi.string().default('15m'),

  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
});
