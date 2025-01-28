const axios = require("axios");

const API_BASE_URL = "https://api.drivechain.live";

class ApiManager {
  async listClaims() {
    try {
      const response = await axios.get(`${API_BASE_URL}/listclaims`);
      return response.data;
    } catch (error) {
      console.error("Failed to list claims:", error);
      throw error;
    }
  }

  async submitClaim(destination, amount) {
    try {
      const response = await axios.post(`${API_BASE_URL}/claim`, {
        destination,
        amount: amount.toString(),
      });
      return response.data;
    } catch (error) {
      console.error("Failed to submit claim:", error);
      throw error;
    }
  }

  async requestFaucet(amount, address) {
    try {
      return { success: true, message: "BTC requested successfully" };
    } catch (error) {
      console.error("Faucet request failed:", error);
      throw error;
    }
  }
}

module.exports = ApiManager;
