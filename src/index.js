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
  console.log('=== WEBHOOK RECEIVED ===');
  
  try {
    // Log headers
    console.log('Headers:', {
      'X-Shopify-Topic': req.get('X-Shopify-Topic'),
      'X-Shopify-Shop-Domain': req.get('X-Shopify-Shop-Domain'),
      'X-Shopify-Hmac-Sha256': req.get('X-Shopify-Hmac-Sha256') ? 'present' : 'missing',
      'Content-Type': req.get('Content-Type'),
    });

    // Log raw body info
    console.log('Body type:', typeof req.body);
    console.log('Body is Buffer:', Buffer.isBuffer(req.body));
    console.log('Body length:', req.body?.length || 0);

    // Verify webhook signature
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    
    if (!hmac) {
      console.error('❌ Missing HMAC signature');
      return res.status(401).send('Unauthorized: Missing signature');
    }

    // Get raw body as string for signature verification
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }

    console.log('Raw body (first 200 chars):', rawBody.substring(0, 200));

    // Verify signature
    console.log('🔐 Verifying webhook signature...');
    const isValid = verifyShopifyWebhook(rawBody, hmac);
    
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).send('Unauthorized: Invalid signature');
    }

    console.log('✅ Signature verified');
    console.log(`📦 Received webhook: ${topic} from ${shop}`);

    // Parse JSON body
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log('✅ JSON parsed successfully');
      console.log('Webhook data:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Raw body that failed to parse:', rawBody);
      return res.status(400).send('Invalid JSON payload');
    }

    // Process the inventory update
    console.log('🔄 Processing inventory update...');
    await handleInventoryUpdate(webhookData, shop);
    console.log('✅ Inventory update processed successfully');

    // Respond quickly to Shopify
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    console.error('Stack trace:', error.stack);
    // Still return 200 to prevent Shopify from retrying
    res.status(200).send('Error logged');
  }
  
  console.log('=== WEBHOOK PROCESSING COMPLETE ===\n');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚨 Shopify Negative Stock Police is running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhooks/inventory-update`);
  
  // Validate environment variables
  const warnings = [];
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    warnings.push('SHOPIFY_WEBHOOK_SECRET');
  }
  if (!process.env.SLACK_WEBHOOK_URL) {
    warnings.push('SLACK_WEBHOOK_URL');
  }
  if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
    warnings.push('SHOPIFY_ADMIN_API_TOKEN');
  }
  if (!process.env.SHOPIFY_STORE_DOMAIN) {
    warnings.push('SHOPIFY_STORE_DOMAIN');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables:', warnings.join(', '));
  } else {
    console.log('✅ All environment variables configured');
  }
});
