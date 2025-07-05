import express from 'express';
import cors from 'cors';
import { getDatabase } from '../db/setup.js';
import { ethers } from 'ethers';
import { createHTLCScript, generateKeyPair, createAddress } from '../btc/htlc.js';
import EthEscrowManager from '../eth/escrow.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = getDatabase();

// Ethereum setup
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL || 'http://localhost:8545');
const ethWallet = new ethers.Wallet(process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey, provider);
const escrowManager = new EthEscrowManager(provider, ethWallet);

// Helper functions
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateHashlock(secret: string): string {
  return crypto.createHash('sha256').update(secret, 'hex').digest('hex');
}

// API Routes

/**
 * POST /swap/create - Create a new atomic swap
 */
app.post('/swap/create', async (req, res) => {
  try {
    const {
      direction,
      btc_amount,
      eth_amount,
      btc_pubkey,
      eth_address,
      expiration_hours = 24
    } = req.body;

    // Validate input
    if (!['btc-to-eth', 'eth-to-btc'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }

    if (!btc_amount || !eth_amount || !eth_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate secret and hashlock
    const secret = generateSecret();
    const hashlock = generateHashlock(secret);
    const expiration = Math.floor(Date.now() / 1000) + (expiration_hours * 3600);

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO swaps (
        direction, hashlock, secret, btc_amount, eth_amount, 
        btc_pubkey, eth_address, expiration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      direction,
      hashlock,
      secret,
      btc_amount,
      eth_amount,
      btc_pubkey || null,
      eth_address,
      expiration
    );

    res.json({
      swap_id: result.lastInsertRowid,
      hashlock,
      secret: direction === 'eth-to-btc' ? secret : undefined, // Only reveal secret for ETH->BTC
      expiration,
      direction
    });
  } catch (error) {
    console.error('Error creating swap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /swap/:id/fund-btc - Mark Bitcoin HTLC as funded
 */
app.post('/swap/:id/fund-btc', async (req, res) => {
  try {
    const { id } = req.params;
    const { redeemScript, btc_txid } = req.body;

    if (!redeemScript || !btc_txid) {
      return res.status(400).json({ error: 'Missing redeemScript or btc_txid' });
    }

    // Update database
    const stmt = db.prepare(`
      UPDATE swaps 
      SET btc_funded = TRUE, btc_redeem_script = ?, btc_txid = ?, status = 'funded', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    const result = stmt.run(redeemScript, btc_txid, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    res.json({ success: true, message: 'Bitcoin HTLC marked as funded' });
  } catch (error) {
    console.error('Error funding BTC:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /swap/:id/fund-eth - Deploy and fund Ethereum escrow
 */
app.post('/swap/:id/fund-eth', async (req, res) => {
  try {
    const { id } = req.params;

    // Get swap details
    const swap = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    // Deploy escrow contract
    const { address, txHash } = await escrowManager.deployEscrow(
      swap.eth_address,
      '0x' + swap.hashlock,
      swap.expiration,
      ethers.formatEther(swap.eth_amount)
    );

    // Update database
    const stmt = db.prepare(`
      UPDATE swaps 
      SET eth_funded = TRUE, eth_escrow_address = ?, status = 'funded', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(address, id);

    res.json({
      success: true,
      escrow_address: address,
      tx_hash: txHash,
      message: 'Ethereum escrow deployed and funded'
    });
  } catch (error) {
    console.error('Error funding ETH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /swap/:id/submit-secret - Submit secret to claim funds
 */
app.post('/swap/:id/submit-secret', async (req, res) => {
  try {
    const { id } = req.params;
    const { secret } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'Missing secret' });
    }

    // Get swap details
    const swap = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    // Verify secret
    const hashlock = generateHashlock(secret);
    if (hashlock !== swap.hashlock) {
      return res.status(400).json({ error: 'Invalid secret' });
    }

    // Update database
    const stmt = db.prepare(`
      UPDATE swaps 
      SET secret_revealed = TRUE, secret_revealed_at = strftime('%s', 'now'), 
          status = 'completed', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(id);

    res.json({
      success: true,
      message: 'Secret submitted successfully',
      secret
    });
  } catch (error) {
    console.error('Error submitting secret:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /swap/:id - Get swap details
 */
app.get('/swap/:id', (req, res) => {
  try {
    const { id } = req.params;
    const swap = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id);

    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    // Don't expose secret unless it's revealed
    if (!swap.secret_revealed) {
      delete swap.secret;
    }

    res.json(swap);
  } catch (error) {
    console.error('Error getting swap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /swaps - Get all swaps
 */
app.get('/swaps', (req, res) => {
  try {
    const { status, direction } = req.query;
    let query = 'SELECT * FROM swaps WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (direction) {
      query += ' AND direction = ?';
      params.push(direction);
    }

    query += ' ORDER BY created_at DESC';

    const swaps = db.prepare(query).all(...params);

    // Remove secrets from non-revealed swaps
    const sanitizedSwaps = swaps.map((swap: any) => {
      if (!swap.secret_revealed) {
        const { secret, ...sanitized } = swap;
        return sanitized;
      }
      return swap;
    });

    res.json(sanitizedSwaps);
  } catch (error) {
    console.error('Error getting swaps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /swap/:id/claim-eth - Claim ETH from escrow
 */
app.post('/swap/:id/claim-eth', async (req, res) => {
  try {
    const { id } = req.params;
    const { secret } = req.body;

    // Get swap details
    const swap = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    if (!swap.eth_escrow_address) {
      return res.status(400).json({ error: 'ETH escrow not deployed' });
    }

    // Claim from escrow
    const { txHash } = await escrowManager.claim(swap.eth_escrow_address, secret);

    // Update database
    const stmt = db.prepare(`
      UPDATE swaps 
      SET secret_revealed = TRUE, secret_revealed_at = strftime('%s', 'now'), 
          status = 'completed', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(id);

    res.json({
      success: true,
      tx_hash: txHash,
      message: 'ETH claimed successfully'
    });
  } catch (error) {
    console.error('Error claiming ETH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /swap/:id/refund-eth - Refund ETH from escrow after timeout
 */
app.post('/swap/:id/refund-eth', async (req, res) => {
  try {
    const { id } = req.params;

    // Get swap details
    const swap = db.prepare('SELECT * FROM swaps WHERE id = ?').get(id);
    if (!swap) {
      return res.status(404).json({ error: 'Swap not found' });
    }

    if (!swap.eth_escrow_address) {
      return res.status(400).json({ error: 'ETH escrow not deployed' });
    }

    // Check if timeout has passed
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < swap.expiration) {
      return res.status(400).json({ error: 'Timeout not yet reached' });
    }

    // Refund from escrow
    const { txHash } = await escrowManager.refund(swap.eth_escrow_address);

    // Update database
    const stmt = db.prepare(`
      UPDATE swaps 
      SET status = 'refunded', updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(id);

    res.json({
      success: true,
      tx_hash: txHash,
      message: 'ETH refunded successfully'
    });
  } catch (error) {
    console.error('Error refunding ETH:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /status - API health check
 */
app.get('/status', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Atomic Swap API server running on port ${port}`);
  console.log(`📊 Database: swaps.db`);
  console.log(`🔗 Ethereum RPC: ${process.env.ETH_RPC_URL || 'http://localhost:8545'}`);
});

export default app;