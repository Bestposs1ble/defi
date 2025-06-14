require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

module.exports = {
  solidity: "0.8.7",
  networks: {
    hardhat: {
      // 本地测试网络配置
    },
    localhost: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
}; 