const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 MyToken
  const MyToken = await hre.ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy(ethers.utils.parseUnits("1000000", 18));
  await myToken.deployed();
  console.log("MyToken deployed to:", myToken.address);

  // 部署 LendingPool
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(myToken.address);
  await lendingPool.deployed();
  console.log("LendingPool deployed to:", lendingPool.address);

  // 只输出合约地址，方便手动复制
  console.log("Contract addresses:");
  console.log("MyToken:", myToken.address);
  console.log("LendingPool:", lendingPool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 