const axios = require("axios");

class ApiManager {
  constructor() {
    this.API_BASE_URL = "https://api.drivechain.live";
  }

  async listClaims() {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/listclaims`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error("Failed to list claims:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async submitClaim(destination, amount) {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/claim`, {
        destination,
        amount: amount.toString(),
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error("Failed to submit claim:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async requestFaucet(amount, address) {
    try {
      // Placeholder for API call
      // const response = await axios.post('https://faucet-api-url.com', { amount, address });
      // return response.data;

      // For now, we'll just return a mock successful response
      return {
        success: true,
        data: { message: "BTC requested successfully" }
      };
    } catch (error) {
      console.error("Faucet request failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ApiManager;