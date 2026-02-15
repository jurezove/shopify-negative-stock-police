import crypto from 'crypto';

/**
 * Verify Shopify webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} hmacHeader - HMAC signature from X-Shopify-Hmac-Sha256 header
 * @returns {boolean} - True if signature is valid
 */
export function verifyShopifyWebhook(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('SHOPIFY_WEBHOOK_SECRET is not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}
