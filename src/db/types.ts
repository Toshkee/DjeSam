export type SqlValue = string | number | null;

/**
 * The subset of expo-sqlite's `SQLiteDatabase` the app relies on. Keeping it narrow lets the
 * repository run against Node's built-in SQLite in unit tests.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
