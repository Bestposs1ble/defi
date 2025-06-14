const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署 MyToken
  const MyToken = await hre.ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy(1000000); // 初始供应量 1000000
  await myToken.deployed();
  console.log("MyToken deployed to:", myToken.address);

  // 部署 LendingPool
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(myToken.address);
  await lendingPool.deployed();
  console.log("LendingPool deployed to:", lendingPool.address);

  // 输出合约地址，方便后续使用
  console.log("Contract addresses:");
  console.log("MyToken:", myToken.address);
  console.log("LendingPool:", lendingPool.address);

  // 将合约地址写入 .env 文件
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }
  envContent = envContent.replace(/MYTOKEN_ADDRESS=.*\n?/, "");
  envContent = envContent.replace(/LENDINGPOOL_ADDRESS=.*\n?/, "");
  envContent += `MYTOKEN_ADDRESS=${myToken.address}\n`;
  envContent += `LENDINGPOOL_ADDRESS=${lendingPool.address}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log("Contract addresses written to .env");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 