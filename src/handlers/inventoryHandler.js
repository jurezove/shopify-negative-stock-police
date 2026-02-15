import { getProductDetails, getLocationName } from '../services/shopifyClient.js';
import { sendNegativeStockAlert } from '../services/slackNotifier.js';

/**
 * Handle inventory level update webhook from Shopify
 * @param {Object} webhookData - Webhook payload from Shopify
 * @param {string} shop - Shop domain
 */
export async function handleInventoryUpdate(webhookData, shop) {
  try {
    console.log('Processing inventory update:', JSON.stringify(webhookData, null, 2));

    const inventoryItemId = webhookData.inventory_item_id;
    const locationId = webhookData.location_id;
    const available = webhookData.available;

    // Only alert if inventory is negative
    if (available >= 0) {
      console.log(`Inventory is ${available}, no alert needed`);
      return;
    }

    console.log(`⚠️  Negative stock detected: ${available} units`);

    // Fetch product and variant details
    const productDetails = await getProductDetails(inventoryItemId);
    
    if (!productDetails) {
      console.error('Could not fetch product details for inventory item:', inventoryItemId);
      return;
    }

    // Fetch location name
    const locationName = await getLocationName(locationId);

    // Check if webhook contains order information
    // Note: inventory_levels/update webhook typically doesn't include order info
    // But we'll check for it in case Shopify adds it or if it comes from order context
    let orderUrl = null;
    if (webhookData.order_id) {
      orderUrl = `https://${shop}/admin/orders/${webhookData.order_id}`;
    }

    // Send Slack notification
    await sendNegativeStockAlert({
      productTitle: productDetails.productTitle,
      variantTitle: productDetails.variantTitle,
      quantity: available,
      productUrl: productDetails.productUrl,
      locationName: locationName,
      sku: productDetails.variantSku,
      orderUrl: orderUrl,
    });

    console.log('✅ Negative stock alert processed successfully');
  } catch (error) {
    console.error('Error handling inventory update:', error);
    throw error;
  }
}
