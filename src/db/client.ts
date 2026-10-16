import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';
import type { Db } from './types';

const DB_NAME = 'desam.db';

function adapt(db: SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getFirstAsync: <T>(sql: string, params = []) => db.getFirstAsync<T>(sql, params),
    getAllAsync: <T>(sql: string, params = []) => db.getAllAsync<T>(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let dbPromise: Promise<Db> | null = null;

/** Opens and migrates the database once; later callers share the same connection. */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = adapt(await openDatabaseAsync(DB_NAME));
      await migrate(db);
      return db;
    })().catch((error: unknown) => {
      // Allow a retry on the next call instead of caching the failure forever.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}
