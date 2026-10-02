// ENV VALIDATION — Crash loudly at boot if required vars are missing
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),

  // Database
  MONGO_URI: Joi.string().required().messages({
    'any.required': '❌ MONGO_URI is required. Set it in your .env file.',
  }),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(20).required().messages({
    'any.required': '❌ JWT_ACCESS_SECRET is required.',
    'string.min': '❌ JWT_ACCESS_SECRET must be at least 20 characters.',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(20).required().messages({
    'any.required': '❌ JWT_REFRESH_SECRET is required.',
    'string.min': '❌ JWT_REFRESH_SECRET must be at least 20 characters.',
  }),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required().messages({
    'any.required': '❌ CLOUDINARY_CLOUD_NAME is required.',
  }),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required().messages({
    'any.required': '❌ STRIPE_SECRET_KEY is required.',
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional().allow(''),

  // Email (SMTP)
  SMTP_HOST: Joi.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().optional().default(587),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  FROM_EMAIL: Joi.string().optional().default('noreply@techvault.com'),
  FROM_NAME: Joi.string().optional().default('TechVault'),

  // Frontend URLs
  CLIENT_URL: Joi.string().default('http://localhost:5175'),
  ADMIN_URL: Joi.string().default('http://localhost:5176'),

  // Google OAuth2
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().optional().default('http://localhost:5000/api/auth/google/callback'),
}).unknown(true); // Allow other env vars (PATH, HOME, etc.)

export default function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║     ❌ ENVIRONMENT VALIDATION FAILED             ║');
    console.error('╚══════════════════════════════════════════════════╝\n');
    error.details.forEach((d) => {
      console.error(`  • ${d.message}`);
    });
    console.error('\n  Fix your .env file and restart.\n');
    process.exit(1);
  }

  return value;
}
