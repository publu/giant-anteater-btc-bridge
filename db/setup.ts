import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'swaps.db');

export function initializeDatabase() {
  const db = new Database(dbPath);
  
  // Create swaps table
  db.exec(`
    CREATE TABLE IF NOT EXISTS swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL CHECK (direction IN ('btc-to-eth', 'eth-to-btc')),
      hashlock TEXT NOT NULL,
      secret TEXT,
      btc_amount INTEGER NOT NULL,
      eth_amount TEXT NOT NULL,
      btc_pubkey TEXT,
      eth_address TEXT NOT NULL,
      expiration INTEGER NOT NULL,
      btc_funded BOOLEAN DEFAULT FALSE,
      eth_funded BOOLEAN DEFAULT FALSE,
      eth_escrow_address TEXT,
      btc_redeem_script TEXT,
      btc_txid TEXT,
      secret_revealed BOOLEAN DEFAULT FALSE,
      secret_revealed_at INTEGER,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'completed', 'expired', 'refunded')),
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_swaps_direction ON swaps(direction);
    CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);
    CREATE INDEX IF NOT EXISTS idx_swaps_hashlock ON swaps(hashlock);
    CREATE INDEX IF NOT EXISTS idx_swaps_created_at ON swaps(created_at);
  `);
  
  console.log('Database initialized successfully');
  return db;
}

export function getDatabase() {
  return new Database(dbPath);
}

// Initialize database if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}