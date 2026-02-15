import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { handleInventoryUpdate } from './handlers/inventoryHandler.js';
import { verifyShopifyWebhook } from './utils/webhookVerifier.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to capture raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Regular JSON parsing for other routes
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Shopify Negative Stock Police',
    message: 'Service is running'
  });
});

// Health check for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Shopify webhook endpoint for inventory updates
app.post('/webhooks/inventory-update', async (req, res) => {
  try {
    // Verify webhook signature
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    
    if (!hmac) {
      console.error('Missing HMAC signature');
      return res.status(401).send('Unauthorized: Missing signature');
    }

    // Get raw body as string for signature verification
    const rawBody = req.body.toString('utf8');
    const isValid = verifyShopifyWebhook(rawBody, hmac);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Unauthorized: Invalid signature');
    }

    console.log(`Received webhook: ${topic} from ${shop}`);

    // Parse JSON body
    const webhookData = JSON.parse(rawBody);

    // Process the inventory update
    await handleInventoryUpdate(webhookData, shop);

    // Respond quickly to Shopify
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent Shopify from retrying
    res.status(200).send('Error logged');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚨 Shopify Negative Stock Police is running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhooks/inventory-update`);
  
  // Validate environment variables
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.warn('⚠️  WARNING: SHOPIFY_WEBHOOK_SECRET is not set!');
  }
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn('⚠️  WARNING: SLACK_WEBHOOK_URL is not set!');
  }
  if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
    console.warn('⚠️  WARNING: SHOPIFY_ADMIN_API_TOKEN is not set!');
  }
  if (!process.env.SHOPIFY_STORE_DOMAIN) {
    console.warn('⚠️  WARNING: SHOPIFY_STORE_DOMAIN is not set!');
  }
});
