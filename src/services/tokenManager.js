import fetch from 'node-fetch';

/**
 * Token Manager for Shopify OAuth Client Credentials Grant
 * Handles token fetching, caching, and automatic refresh
 */
class TokenManager {
  constructor() {
    this.token = null;
    this.tokenExpiresAt = 0;
    this.shop = process.env.SHOPIFY_SHOP;
    this.clientId = process.env.SHOPIFY_CLIENT_ID;
    this.clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!this.shop || !this.clientId || !this.clientSecret) {
      throw new Error(
        'Missing required environment variables: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET'
      );
    }
  }

  /**
   * Get a valid access token, fetching a new one if needed
   * @returns {Promise<string>} - Valid access token
   */
  async getToken() {
    // Return cached token if still valid (with 1-minute buffer)
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) {
      console.log('🔑 [Token Manager] Using cached access token');
      return this.token;
    }

    console.log('🔑 [Token Manager] Fetching new access token...');
    
    try {
      const tokenUrl = `https://${this.shop}.myshopify.com/admin/oauth/access_token`;
      console.log('🔑 [Token Manager] Token endpoint:', tokenUrl);

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Token Manager] Token request failed:', response.status, errorText);
        throw new Error(`Token request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔑 [Token Manager] Token response:', {
        hasToken: !!data.access_token,
        scope: data.scope,
        expiresIn: data.expires_in
      });

      this.token = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      console.log('✅ [Token Manager] Access token obtained successfully');
      console.log('🔑 [Token Manager] Token expires at:', new Date(this.tokenExpiresAt).toISOString());

      return this.token;
    } catch (error) {
      console.error('❌ [Token Manager] Error fetching token:', error.message);
      throw error;
    }
  }

  /**
   * Clear the cached token (useful for testing or error recovery)
   */
  clearToken() {
    console.log('🔑 [Token Manager] Clearing cached token');
    this.token = null;
    this.tokenExpiresAt = 0;
  }
}

// Export a singleton instance
export const tokenManager = new TokenManager();
