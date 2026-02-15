# OAuth Migration Guide

Your application has been updated to use **Shopify's new OAuth client credentials grant** authentication method instead of direct Admin API tokens.

## What Changed

### Old Method (No Longer Used)
- Required: `SHOPIFY_ADMIN_API_TOKEN`
- Static token that doesn't expire

### New Method (Now Implemented)
- Required: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SHOP`
- Dynamically fetches access tokens that expire after 24 hours
- Automatically caches and refreshes tokens

## Updated Environment Variables

### Railway Configuration

You need to **update your Railway environment variables**:

#### Remove (if present):
- ❌ `SHOPIFY_ADMIN_API_TOKEN`

#### Add these new variables:
- ✅ `SHOPIFY_SHOP` - Your store name only (e.g., `yoursoultime`)
- ✅ `SHOPIFY_CLIENT_ID` - From Dev Dashboard → Your App → Settings
- ✅ `SHOPIFY_CLIENT_SECRET` - From Dev Dashboard → Your App → Settings

#### Keep these existing variables:
- `SHOPIFY_STORE_DOMAIN` - Full domain (e.g., `yoursoultime.myshopify.com`)
- `SHOPIFY_WEBHOOK_SECRET` - From your webhook configuration
- `SLACK_WEBHOOK_URL` - Your Slack webhook URL
- `PORT` - Server port (3000)

### Complete Environment Variable List

```env
# Shopify OAuth Configuration
SHOPIFY_STORE_DOMAIN=yoursoultime.myshopify.com
SHOPIFY_SHOP=yoursoultime
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret_here

# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Server Configuration
PORT=3000
```

## How to Get Your Credentials

### 1. Get Client ID and Secret

1. Go to [Shopify Dev Dashboard](https://partners.shopify.com/organizations)
2. Click **Apps** and select your app
3. Click **Settings**
4. Copy your **Client ID** and **Client secret**

### 2. Update Railway Variables

1. Go to your Railway project dashboard
2. Click the **Variables** tab
3. Add the new variables:
   - `SHOPIFY_SHOP=yoursoultime`
   - `SHOPIFY_CLIENT_ID=<your_client_id>`
   - `SHOPIFY_CLIENT_SECRET=<your_client_secret>`
4. Remove `SHOPIFY_ADMIN_API_TOKEN` if it exists
5. Railway will automatically restart with the new configuration

## How It Works

### Token Management

The application now includes a **Token Manager** that:

1. **Fetches tokens on demand** - When the first API call is made
2. **Caches tokens in memory** - Reuses the same token for 24 hours
3. **Auto-refreshes before expiration** - Fetches a new token 1 minute before expiry
4. **Handles errors gracefully** - Clears invalid tokens and retries

### Authentication Flow

```
1. Webhook received → Need product details
2. Token Manager checks cache
3. If no token or expired:
   - POST to https://yoursoultime.myshopify.com/admin/oauth/access_token
   - Send client_id and client_secret
   - Receive access_token (valid for 24 hours)
   - Cache token with expiration time
4. Use cached token for Shopify API calls
5. Token automatically refreshed when needed
```

## Testing

### After Updating Variables

1. **Check Railway logs** - Look for:
   ```
   ✅ All environment variables configured
   🚨 Shopify Negative Stock Police is running on port 8080
   ```

2. **Trigger a webhook** - Change inventory to negative in Shopify

3. **Watch for token logs**:
   ```
   🔑 [Token Manager] Fetching new access token...
   ✅ [Token Manager] Access token obtained successfully
   🔌 [Shopify API] Getting product details...
   ✅ [Shopify API] Product details retrieved successfully
   📤 [Handler] Sending Slack notification...
   ```

### Common Issues

#### Missing Environment Variables

**Error:** `Missing required environment variables: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET`

**Solution:** Ensure all three OAuth variables are set in Railway

#### Token Request Failed

**Error:** `Token request failed: 401`

**Solution:** 
- Verify Client ID and Secret are correct
- Ensure your app is installed on the store
- Check that `SHOPIFY_SHOP` matches your store name (without `.myshopify.com`)

#### Invalid API Key Error

**Error:** `[API] Invalid API key or access token`

**Solution:**
- The token manager will automatically clear the cache and retry
- If persistent, check that your app has the required scopes (`read_inventory`, `read_products`)

## Benefits of OAuth

✅ **More secure** - Tokens expire and rotate automatically
✅ **Better compliance** - Follows Shopify's latest security standards
✅ **Automatic refresh** - No manual token management needed
✅ **Error recovery** - Handles token expiration gracefully

## Rollback (If Needed)

If you need to temporarily rollback to the old authentication method:

1. In Railway, add back `SHOPIFY_ADMIN_API_TOKEN`
2. Deploy the previous version from GitHub
3. The old code will use the static token

However, this is **not recommended** as Shopify is moving away from static tokens.

---

**Questions?** Check the Railway logs for detailed debugging information with emoji-prefixed log lines for easy scanning.
