import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/models';

const connectionString = process.env.DATABASE_URL!;

// Disable prepared statements for Supabase Pooler compatibility
const client = postgres(connectionString, { 
  prepare: false 
});

export const Database = drizzle(client, { schema });   