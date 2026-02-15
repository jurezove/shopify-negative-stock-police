# 🚨 Shopify Negative Stock Police

A backend service that monitors Shopify inventory levels in real-time and sends Slack alerts when stock goes negative.

## Features

- **Real-time monitoring** via Shopify webhooks (`inventory_levels/update`)
- **Secure webhook verification** using HMAC SHA-256 signatures
- **Rich Slack notifications** with product details, variant info, location, and direct links
- **Zero-configuration deployment** on Railway
- **Automatic product lookup** using Shopify Admin GraphQL API

## How It Works

1. Shopify sends a webhook when inventory levels change at any location
2. The service verifies the webhook signature for security
3. If inventory is negative (< 0), it fetches product and variant details
4. A formatted alert is sent to your configured Slack channel with:
   - Product name and variant
   - Current quantity
   - Location name
   - SKU
   - Direct link to the product
   - Order link (if available in webhook data)

## Prerequisites

Before deploying, you need:

1. **Shopify Admin API Access Token** with `read_inventory` and `read_products` scopes
2. **Shopify Webhook Signing Secret** (obtained when creating the webhook)
3. **Slack Webhook URL** for your target channel

## Setup Instructions

### 1. Get Shopify Credentials

#### Create Custom App:
1. Go to your Shopify Admin: `https://yoursoultime.myshopify.com/admin`
2. Navigate to **Settings** → **Apps and sales channels** → **Develop apps**
3. Click **"Create an app"** and name it (e.g., "Inventory Alert Service")
4. Click **"Configure Admin API scopes"**
5. Enable these scopes:
   - ✅ `read_inventory`
   - ✅ `read_products`
6. Click **"Save"** then **"Install app"**
7. Copy the **Admin API Access Token** (you'll only see it once!)

#### Create Webhook:
1. In your custom app, go to **"API credentials"** tab
2. Scroll to **"Webhooks"** section
3. Click **"Create webhook subscription"**
4. Configure:
   - **Event**: `inventory_levels/update`
   - **Format**: JSON
   - **URL**: Your Railway deployment URL + `/webhooks/inventory-update`
     - Example: `https://your-app.railway.app/webhooks/inventory-update`
   - **API version**: 2024-01 (or latest)
5. After creating, copy the **Webhook signing secret**

### 2. Get Slack Webhook URL

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name it (e.g., "Inventory Alerts") and select your workspace
4. Go to **"Incoming Webhooks"** in the sidebar
5. Toggle **"Activate Incoming Webhooks"** to ON
6. Click **"Add New Webhook to Workspace"**
7. Select the channel for alerts
8. Copy the **Webhook URL**

### 3. Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)

1. Push this repository to GitHub
2. Go to [Railway](https://railway.app)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select this repository
5. Add environment variables:
   ```
   SHOPIFY_STORE_DOMAIN=yoursoultime.myshopify.com
   SHOPIFY_ADMIN_API_TOKEN=your_admin_api_token
   SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   PORT=3000
   ```
6. Deploy!
7. Copy your Railway deployment URL
8. Go back to Shopify and update the webhook URL with your Railway URL

#### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set SHOPIFY_STORE_DOMAIN=yoursoultime.myshopify.com
railway variables set SHOPIFY_ADMIN_API_TOKEN=your_token
railway variables set SHOPIFY_WEBHOOK_SECRET=your_secret
railway variables set SLACK_WEBHOOK_URL=your_webhook_url

# Deploy
railway up
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_STORE_DOMAIN` | Your Shopify store domain (e.g., `yoursoultime.myshopify.com`) | ✅ Yes |
| `SHOPIFY_ADMIN_API_TOKEN` | Admin API access token from custom app | ✅ Yes |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook signing secret for verification | ✅ Yes |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL for Slack notifications | ✅ Yes |
| `PORT` | Server port (default: 3000) | ❌ No |

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run the server
npm start

# Or run with auto-reload
npm run dev
```

### Testing Webhooks Locally

Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL in your Shopify webhook configuration
# Example: https://abc123.ngrok.io/webhooks/inventory-update
```

## API Endpoints

- `GET /` - Health check and service info
- `GET /health` - Health check for Railway
- `POST /webhooks/inventory-update` - Shopify webhook endpoint

## Slack Notification Format

When negative stock is detected, you'll receive a Slack message like:

```
🚨 Negative Stock Alert

Product: The Draft Snowboard - Medium
Current Quantity: -2

Location: Main Warehouse
SKU: DRAFT-MED-001

⚠️ This product has gone into negative stock and needs immediate attention.
```

## Security

- All webhooks are verified using HMAC SHA-256 signatures
- Invalid signatures are rejected with 401 Unauthorized
- Environment variables keep credentials secure
- No sensitive data is logged

## Troubleshooting

### Webhooks not being received:
- Check that your Railway URL is correct in Shopify webhook settings
- Verify the webhook is active in Shopify
- Check Railway logs for incoming requests

### Slack notifications not sending:
- Verify `SLACK_WEBHOOK_URL` is correct
- Test the webhook URL with curl:
  ```bash
  curl -X POST -H 'Content-Type: application/json' \
    -d '{"text":"Test message"}' \
    YOUR_SLACK_WEBHOOK_URL
  ```

### Product details not showing:
- Ensure `SHOPIFY_ADMIN_API_TOKEN` has `read_products` scope
- Check Railway logs for GraphQL errors

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
