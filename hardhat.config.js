require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      // 本地测试网络配置
    },
    localhost: {
      url: "http://127.0.0.1:9545",
      accounts: ["0x99e6840d8e335f8dab48dedb48d6f6769e0989431b4e759b9673eb154c529c81"]
    },
  },
}; 