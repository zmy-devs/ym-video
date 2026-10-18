import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema/auth';

export const createDatabase = (binding: D1Database) =>
  drizzle(binding, { schema });
