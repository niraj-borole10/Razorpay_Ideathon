import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { apiRouter } from './routes/apiRoutes';
import { connectToDatabase, isMongoConnected } from './db/connection';
import { seedInitialUsers } from './auth/authController';
import { orderService } from './orders/orderService';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api/v1', apiRouter);

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server and initialize database
const server = app.listen(config.port, async () => {
  // Connect to MongoDB
  const dbConnected = await connectToDatabase();
  await seedInitialUsers();
  await orderService.seedInitialOrders();

  console.log(`
===============================================================
🚀 RAZORPAY AGENTIC COMMERCE ENGINE (Track 01 Prototype)
===============================================================
🟢 Server running on: http://localhost:${config.port}
🍃 MongoDB: ${dbConnected ? 'CONNECTED & PERSISTENT (' + config.mongodbUri + ')' : 'FALLBACK PERSISTENCE MODE'}
💳 Razorpay Mode: ${config.mockRazorpayMode ? 'SANDBOX SIMULATOR (Zero-friction demo)' : 'LIVE TEST MODE'}
🛡️ Guardrails: Max Discount ${config.guardrails.maxAllowedDiscountPct}%, Max Txn ₹${config.guardrails.maxTransactionLimitInr}
🤖 AP2 Catalog Manifest: http://localhost:${config.port}/api/v1/agent/catalog
💬 Conversational Chat: http://localhost:${config.port}
📊 Audit Dashboard: http://localhost:${config.port} (Tab: Trust & Audit)
===============================================================
  `);
});

export default app;
