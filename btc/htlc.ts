import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);

// Use Bitcoin testnet
const network = bitcoin.networks.testnet;

export interface HTLCScript {
  redeemScript: Buffer;
  address: string;
  scriptPubKey: Buffer;
  p2wsh: bitcoin.Payment;
}

export interface HTLCParams {
  hashlock: Buffer;
  recipientPubkey: Buffer;
  refundPubkey: Buffer;
  locktime: number;
}

/**
 * Create HTLC script for Bitcoin
 */
export function createHTLCScript(params: HTLCParams): HTLCScript {
  const { hashlock, recipientPubkey, refundPubkey, locktime } = params;
  
  // HTLC script: 
  // OP_IF
  //   OP_SHA256 <hashlock> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
  // OP_ELSE
  //   <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <refundPubkey> OP_CHECKSIG
  // OP_ENDIF
  
  const redeemScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      hashlock,
      bitcoin.opcodes.OP_EQUALVERIFY,
      recipientPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(locktime),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      refundPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ENDIF,
  ]);
  
  // Create P2WSH (Pay to Witness Script Hash)
  const p2wsh = bitcoin.payments.p2wsh({
    redeem: { output: redeemScript },
    network
  });
  
  if (!p2wsh.address || !p2wsh.output) {
    throw new Error('Failed to create P2WSH payment');
  }
  
  return {
    redeemScript,
    address: p2wsh.address,
    scriptPubKey: p2wsh.output,
    p2wsh
  };
}

/**
 * Build funding transaction
 */
export function buildFundingTx(
  utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: Buffer;
  }>,
  htlcAddress: string,
  amount: number,
  changeAddress: string,
  keyPair: any
): bitcoin.Transaction {
  const psbt = new bitcoin.Psbt({ network });
  
  let totalInput = 0;
  
  // Add inputs
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: utxo.scriptPubKey,
        value: utxo.value
      }
    });
    totalInput += utxo.value;
  }
  
  // Add HTLC output
  psbt.addOutput({
    address: htlcAddress,
    value: amount
  });
  
  // Add change output if needed
  const fee = 1000; // 1000 satoshis fee
  const change = totalInput - amount - fee;
  
  if (change > 546) { // Dust limit
    psbt.addOutput({
      address: changeAddress,
      value: change
    });
  }
  
  // Sign all inputs
  for (let i = 0; i < utxos.length; i++) {
    psbt.signInput(i, keyPair);
  }
  
  psbt.finalizeAllInputs();
  
  return psbt.extractTransaction();
}

/**
 * Build redeem transaction (claim with secret)
 */
export function buildRedeemTx(
  htlcUtxo: {
    txid: string;
    vout: number;
    value: number;
  },
  htlcScript: HTLCScript,
  recipientAddress: string,
  secret: Buffer,
  recipientKeyPair: any
): bitcoin.Transaction {
  const psbt = new bitcoin.Psbt({ network });
  
  // Add HTLC input
  psbt.addInput({
    hash: htlcUtxo.txid,
    index: htlcUtxo.vout,
    witnessUtxo: {
      script: htlcScript.scriptPubKey,
      value: htlcUtxo.value
    },
    witnessScript: htlcScript.redeemScript
  });
  
  // Add output to recipient
  const fee = 1000;
  psbt.addOutput({
    address: recipientAddress,
    value: htlcUtxo.value - fee
  });
  
  // Create witness for redeem path (OP_IF branch)
  const witness = [
    Buffer.alloc(0), // Signature placeholder
    secret,
    Buffer.from([0x01]), // OP_TRUE for OP_IF
    htlcScript.redeemScript
  ];
  
  // Sign the transaction
  const signatureHash = psbt.data.inputs[0];
  psbt.signInput(0, recipientKeyPair);
  
  // Set the witness manually
  psbt.finalizeInput(0, (inputIndex, input) => {
    const signature = input.partialSig![0].signature;
    return {
      finalScriptWitness: bitcoin.script.toStack([
        signature,
        secret,
        Buffer.from([0x01]),
        htlcScript.redeemScript
      ])
    };
  });
  
  return psbt.extractTransaction();
}

/**
 * Build refund transaction (after timeout)
 */
export function buildRefundTx(
  htlcUtxo: {
    txid: string;
    vout: number;
    value: number;
  },
  htlcScript: HTLCScript,
  refundAddress: string,
  refundKeyPair: any,
  locktime: number
): bitcoin.Transaction {
  const psbt = new bitcoin.Psbt({ network });
  
  // Set locktime
  psbt.setLocktime(locktime);
  
  // Add HTLC input
  psbt.addInput({
    hash: htlcUtxo.txid,
    index: htlcUtxo.vout,
    witnessUtxo: {
      script: htlcScript.scriptPubKey,
      value: htlcUtxo.value
    },
    witnessScript: htlcScript.redeemScript,
    sequence: 0xfffffffe // Required for CHECKLOCKTIMEVERIFY
  });
  
  // Add output to refund address
  const fee = 1000;
  psbt.addOutput({
    address: refundAddress,
    value: htlcUtxo.value - fee
  });
  
  // Sign the transaction
  psbt.signInput(0, refundKeyPair);
  
  // Set the witness manually for refund path (OP_ELSE branch)
  psbt.finalizeInput(0, (inputIndex, input) => {
    const signature = input.partialSig![0].signature;
    return {
      finalScriptWitness: bitcoin.script.toStack([
        signature,
        Buffer.from([0x00]), // OP_FALSE for OP_ELSE
        htlcScript.redeemScript
      ])
    };
  });
  
  return psbt.extractTransaction();
}

/**
 * Extract secret from redeem transaction
 */
export function extractSecretFromTx(tx: bitcoin.Transaction): Buffer | null {
  for (const input of tx.ins) {
    if (input.witness && input.witness.length >= 4) {
      // Check if this is a redeem transaction (has secret in witness)
      const secret = input.witness[1];
      if (secret && secret.length === 32) {
        return secret;
      }
    }
  }
  return null;
}

/**
 * Generate key pair for testing
 */
export function generateKeyPair() {
  return ECPair.makeRandom({ network });
}

/**
 * Create address from public key
 */
export function createAddress(publicKey: Buffer): string {
  const p2wpkh = bitcoin.payments.p2wpkh({ 
    pubkey: publicKey, 
    network 
  });
  
  if (!p2wpkh.address) {
    throw new Error('Failed to create address');
  }
  
  return p2wpkh.address;
}