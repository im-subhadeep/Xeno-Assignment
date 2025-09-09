#!/usr/bin/env node

// scripts/worker.js
// This script should be run as a separate process to handle message queue jobs

const path = require('path');
const { createRequire } = require('module');

// Setup environment
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Import and start workers
async function startWorkers() {
  try {
    console.log('Starting message queue workers...');
    
    // Import the workers (this will start them)
    const { messageWorker, batchWorker } = await import('../src/lib/messageQueue.js');
    
    console.log('✅ Message workers started successfully');
    console.log('📋 Campaign delivery worker running with concurrency: 5');
    console.log('📦 Batch processing worker running with concurrency: 2');
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down workers...');
      await messageWorker.close();
      await batchWorker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down workers...');
      await messageWorker.close();
      await batchWorker.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  }
}

startWorkers();
