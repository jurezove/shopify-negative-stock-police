import fetch from 'node-fetch';
import { tokenManager } from './tokenManager.js';

/**
 * Fetch product and variant details from Shopify Admin API
 * @param {string} inventoryItemId - The inventory item ID
 * @returns {Promise<Object>} - Product and variant information
 */
export async function getProductDetails(inventoryItemId) {
  console.log('🔌 [Shopify API] Getting product details for inventory item:', inventoryItemId);
  
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    console.error('❌ [Shopify API] Missing SHOPIFY_STORE_DOMAIN');
    throw new Error('SHOPIFY_STORE_DOMAIN not configured');
  }

  try {
    // Get access token from token manager
    const accessToken = await tokenManager.getToken();

    // GraphQL query to get product and variant details by inventory item ID
    const query = `
      query getInventoryItem($id: ID!) {
        inventoryItem(id: $id) {
          id
          variant {
            id
            title
            displayName
            price
            sku
            product {
              id
              title
              handle
              onlineStoreUrl
            }
          }
        }
      }
    `;

    const apiUrl = `https://${storeDomain}/admin/api/2024-01/graphql.json`;
    console.log('🔌 [Shopify API] Calling:', apiUrl);
    console.log('🔌 [Shopify API] Query variables:', { id: `gid://shopify/InventoryItem/${inventoryItemId}` });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          id: `gid://shopify/InventoryItem/${inventoryItemId}`,
        },
      }),
    });

    const data = await response.json();
    console.log('🔌 [Shopify API] Response status:', response.status);
    console.log('🔌 [Shopify API] Response data:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('❌ [Shopify API] GraphQL errors:', data.errors);
      
      // If token is invalid, clear it and retry once
      if (data.errors.some(e => e.message.includes('Invalid API key') || e.message.includes('access token'))) {
        console.log('🔄 [Shopify API] Token may be invalid, clearing cache and retrying...');
        tokenManager.clearToken();
        // Don't retry here to avoid infinite loop - let caller handle
      }
      
      throw new Error('Failed to fetch product details from Shopify');
    }

    const inventoryItem = data.data?.inventoryItem;
    
    if (!inventoryItem || !inventoryItem.variant) {
      console.warn('⚠️  [Shopify API] No inventory item or variant found');
      return null;
    }
    
    console.log('✅ [Shopify API] Product details retrieved successfully');

    const variant = inventoryItem.variant;
    const product = variant.product;

    return {
      productId: product.id,
      productTitle: product.title,
      productHandle: product.handle,
      productUrl: product.onlineStoreUrl || `https://${storeDomain}/products/${product.handle}`,
      variantId: variant.id,
      variantTitle: variant.title,
      variantDisplayName: variant.displayName,
      variantSku: variant.sku,
      variantPrice: variant.price,
    };
  } catch (error) {
    console.error('❌ [Shopify API] Error fetching product details:', error.message);
    throw error;
  }
}

/**
 * Get location name by location ID
 * @param {string} locationId - The location ID
 * @returns {Promise<string>} - Location name
 */
export async function getLocationName(locationId) {
  console.log('🔌 [Shopify API] Getting location name for:', locationId);
  
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    console.error('❌ [Shopify API] Missing SHOPIFY_STORE_DOMAIN');
    throw new Error('SHOPIFY_STORE_DOMAIN not configured');
  }

  try {
    // Get access token from token manager
    const accessToken = await tokenManager.getToken();

    const query = `
      query getLocation($id: ID!) {
        location(id: $id) {
          id
          name
        }
      }
    `;

    const apiUrl = `https://${storeDomain}/admin/api/2024-01/graphql.json`;
    console.log('🔌 [Shopify API] Calling:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          id: `gid://shopify/Location/${locationId}`,
        },
      }),
    });

    const data = await response.json();
    console.log('🔌 [Shopify API] Location response status:', response.status);

    if (data.errors) {
      console.error('❌ [Shopify API] GraphQL errors:', data.errors);
      return `Location ${locationId}`;
    }

    const locationName = data.data?.location?.name || `Location ${locationId}`;
    console.log('✅ [Shopify API] Location name:', locationName);
    
    return locationName;
  } catch (error) {
    console.error('❌ [Shopify API] Error fetching location name:', error.message);
    return `Location ${locationId}`;
  }
}
