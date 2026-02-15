import fetch from 'node-fetch';

/**
 * Send notification to Slack about negative inventory
 * @param {Object} params - Notification parameters
 * @param {string} params.productTitle - Product name
 * @param {string} params.variantTitle - Variant name
 * @param {number} params.quantity - Current inventory quantity
 * @param {string} params.productUrl - Link to product
 * @param {string} params.locationName - Location name
 * @param {string} params.sku - Product SKU
 * @param {string} params.orderUrl - Optional order link
 */
export async function sendNegativeStockAlert(params) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL is not configured');
    return;
  }

  const {
    productTitle,
    variantTitle,
    quantity,
    productUrl,
    locationName,
    sku,
    orderUrl,
  } = params;

  // Build variant display name
  const variantDisplay = variantTitle && variantTitle !== 'Default Title' 
    ? `${productTitle} - ${variantTitle}` 
    : productTitle;

  // Build the Slack message
  const message = {
    text: '🚨 *Negative Stock Police is on the chase!*',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Negative Stock Police is on the chase!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Product:*\n<${productUrl}|${variantDisplay}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Quantity:*\n${quantity}`,
          },
          {
            type: 'mrkdwn',
            text: `*Location:*\n${locationName}`,
          },
          {
            type: 'mrkdwn',
            text: `*SKU:*\n${sku || 'N/A'}`,
          },
        ],
      },
    ],
  };

  // Add order link if available
  if (orderUrl) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Related Order:*\n<${orderUrl}|View Order>`,
      },
    });
  }

  message.blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `⚠️ This product has gone into negative stock and needs immediate attention.`,
      },
    ],
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText);
    } else {
      console.log('✅ Slack notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}
