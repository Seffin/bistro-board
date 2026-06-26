import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dummy';
const client = neon(connectionString);

export const db = drizzle(client, { schema });
