/// <reference types="node" />

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
});
