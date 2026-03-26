import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_TOKENS: z.coerce.number().default(500),

  // HubSpot
  HUBSPOT_ACCESS_TOKEN: z.string().min(1),

  // Scraper
  SCRAPER_CONCURRENCY: z.coerce.number().default(3),
  SCRAPER_TIMEOUT_MS: z.coerce.number().default(30000),
  SCRAPER_MAX_RETRIES: z.coerce.number().default(3),
  SCRAPER_HEADLESS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),

  // Queue
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(5000),
  QUEUE_MAX_SIZE: z.coerce.number().default(1000),

  // Validation
  VALIDATION_MIN_SCORE: z.coerce.number().default(60),

  // Auth
  AUTH_CALLBACK_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadConfig(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment configuration error:\n${missingVars}`);
  }

  return result.data;
}

export const config = loadConfig();
