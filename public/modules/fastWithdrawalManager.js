const { app, shell } = require("electron");
const { EventEmitter } = require('events');
const axios = require("axios");


class FastWithdrawalManager extends EventEmitter {
  constructor() {
    super();
    this.rpcConfigBTC = {
      host: '127.0.0.1',
      port: 38332,
      user: 'user',
      password: 'password'
    };
  }

  async makeRpcCallBTC(method, params = []) {
    try {
      const response = await axios.post(`http://${this.rpcConfigBTC.host}:${this.rpcConfigBTC.port}`, {
        jsonrpc: '1.0',
        id: 'fastwithdrawal',
        method,
        params
      }, {
        auth: {
          username: this.rpcConfigBTC.user,
          password: this.rpcConfigBTC.password
        }
      });
      return response.data.result;
    } catch (error) {
      console.error(`RPC call failed (${method}):`, error.message);
      throw error;
    }
  }

  async getBalanceBTC() {
    try {
      const info = await this.makeRpcCallBTC('getbalance');
      console.debug("getbalance response: ", info)
      return {
        info
      };
    } catch (error) {
      console.error('Failed to get BTC balance:', error);
      throw error;
    }
  }
}

module.exports = FastWithdrawalManager;
