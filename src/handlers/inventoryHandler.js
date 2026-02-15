import { getProductDetails, getLocationName } from '../services/shopifyClient.js';
import { sendNegativeStockAlert } from '../services/slackNotifier.js';

/**
 * Handle inventory level update webhook from Shopify
 * @param {Object} webhookData - Webhook payload from Shopify
 * @param {string} shop - Shop domain
 */
export async function handleInventoryUpdate(webhookData, shop) {
  try {
    console.log('📋 [Handler] Starting inventory update processing...');
    console.log('📋 [Handler] Webhook data:', JSON.stringify(webhookData, null, 2));

    const inventoryItemId = webhookData.inventory_item_id;
    const locationId = webhookData.location_id;
    const available = webhookData.available;
    
    console.log('📋 [Handler] Extracted data:', { inventoryItemId, locationId, available });

    // Only alert if inventory is negative
    if (available >= 0) {
      console.log(`📋 [Handler] Inventory is ${available}, no alert needed (threshold: < 0)`);
      return;
    }

    console.log(`⚠️  [Handler] NEGATIVE STOCK DETECTED: ${available} units`);

    // Fetch product and variant details
    console.log('🔍 [Handler] Fetching product details for inventory item:', inventoryItemId);
    const productDetails = await getProductDetails(inventoryItemId);
    
    if (!productDetails) {
      console.error('❌ [Handler] Could not fetch product details for inventory item:', inventoryItemId);
      return;
    }
    
    console.log('✅ [Handler] Product details fetched:', productDetails);

    // Fetch location name
    console.log('🔍 [Handler] Fetching location name for location:', locationId);
    const locationName = await getLocationName(locationId);
    console.log('✅ [Handler] Location name:', locationName);

    // Check if webhook contains order information
    // Note: inventory_levels/update webhook typically doesn't include order info
    // But we'll check for it in case Shopify adds it or if it comes from order context
    let orderUrl = null;
    if (webhookData.order_id) {
      orderUrl = `https://${shop}/admin/orders/${webhookData.order_id}`;
    }

    // Send Slack notification
    console.log('📤 [Handler] Sending Slack notification...');
    await sendNegativeStockAlert({
      productTitle: productDetails.productTitle,
      variantTitle: productDetails.variantTitle,
      quantity: available,
      productUrl: productDetails.productUrl,
      locationName: locationName,
      sku: productDetails.variantSku,
      orderUrl: orderUrl,
    });

    console.log('✅ [Handler] Negative stock alert processed successfully');
  } catch (error) {
    console.error('Error handling inventory update:', error);
    throw error;
  }
}
