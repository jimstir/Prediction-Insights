require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat network
    hardhat: {
      chainId: 31337,
    },

    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // Somnia Mainnet
    somnia: {
      url: process.env.SOMNIA_RPC_URL || "https://somnia-mainnet.xyz/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 55,
    },

    // Somnia Testnet
    somiaTtestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL || "https://testnet-rpc.somnia.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 57,
    },

    // Ethereum Sepolia (for testing)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  etherscan: {
    apiKey: {
      somnia: process.env.SOMNIA_ETHERSCAN_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 20000,
  },
};
