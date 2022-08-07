require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config({ path: ".env" });

const ALCHEMY_API_KEY_URL = process.env.ALCHEMY_API_KEY_URL;

const GEORLI_PRIVATE_KEY = process.env.GEORLI_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.4",
  networks: {
    georli: {
      url: ALCHEMY_API_KEY_URL,
      accounts: [GEORLI_PRIVATE_KEY],
    },
  },
};
