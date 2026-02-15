import fetch from 'node-fetch';

/**
 * Fetch product and variant details from Shopify Admin API
 * @param {string} inventoryItemId - The inventory item ID
 * @returns {Promise<Object>} - Product and variant information
 */
export async function getProductDetails(inventoryItemId) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!storeDomain || !accessToken) {
    throw new Error('Shopify credentials not configured');
  }

  try {
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

    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/graphql.json`,
      {
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
      }
    );

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('Failed to fetch product details from Shopify');
    }

    const inventoryItem = data.data?.inventoryItem;
    
    if (!inventoryItem || !inventoryItem.variant) {
      return null;
    }

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
    console.error('Error fetching product details:', error);
    throw error;
  }
}

/**
 * Get location name by location ID
 * @param {string} locationId - The location ID
 * @returns {Promise<string>} - Location name
 */
export async function getLocationName(locationId) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!storeDomain || !accessToken) {
    throw new Error('Shopify credentials not configured');
  }

  try {
    const query = `
      query getLocation($id: ID!) {
        location(id: $id) {
          id
          name
        }
      }
    `;

    const response = await fetch(
      `https://${storeDomain}/admin/api/2024-01/graphql.json`,
      {
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
      }
    );

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return `Location ${locationId}`;
    }

    return data.data?.location?.name || `Location ${locationId}`;
  } catch (error) {
    console.error('Error fetching location name:', error);
    return `Location ${locationId}`;
  }
}
