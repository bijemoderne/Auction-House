// require("@nomicfoundation/hardhat-toolbox");
// require("dotenv").config();

// // Helper function to get env variables with validation
// function getEnvVariable(name, optional = false) {
//   const value = process.env[name];
//   if (!optional && !value) {
//     throw new Error(`Missing required environment variable: ${name}`);
//   }
//   return value;
// }

// module.exports = {
//   solidity: {
//     version: "0.8.20",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200,
//       },
//       viaIR: true,
//     },
//   },
//   networks: {
//     hardhat: {
//       chainId: 31337,
//     },
//     localhost: {
//       url: "http://127.0.0.1:8545",
//       chainId: 31337,
//     },
//     sepolia: {
//       url: getEnvVariable("SEPOLIA_RPC_URL"),
//       accounts: [getEnvVariable("PRIVATE_KEY")],
//       chainId: 11155111,
//     },
//   },
//   etherscan: {
//     apiKey: {
//       sepolia: getEnvVariable("ETHERSCAN_API_KEY"),
//     },
//   },
//   gasReporter: {
//     enabled: process.env.REPORT_GAS === "true",
//     currency: "USD",
//     coinmarketcap: getEnvVariable("COINMARKETCAP_API_KEY", true),
//   },
// };
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // ... rest of your config
};