const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner, user, liquidator] = await hre.ethers.getSigners();
  console.log("Using account:", owner.address);

  // 从环境变量读取合约地址
  const myTokenAddress = process.env.MYTOKEN_ADDRESS;
  const lendingPoolAddress = process.env.LENDINGPOOL_ADDRESS;

  if (!myTokenAddress || !lendingPoolAddress) {
    console.error("Please set MYTOKEN_ADDRESS and LENDINGPOOL_ADDRESS in .env");
    process.exit(1);
  }

  const MyToken = await hre.ethers.getContractFactory("MyToken");
  const myToken = await MyToken.attach(myTokenAddress);

  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.attach(lendingPoolAddress);

  try {
    // 给用户转一些 BP 代币
    await myToken.transfer(user.address, 1000);
    console.log("Transferred 1000 BP to user");
    console.log("User BP balance:", (await myToken.balanceOf(user.address)).toString());

    // 用户授权 LendingPool 使用 BP
    await myToken.connect(user).approve(lendingPool.address, 1000);
    console.log("User approved LendingPool to spend BP");

    // 用户存入 BP 作为抵押
    await lendingPool.connect(user).depositCollateral(100);
    console.log("User deposited 100 BP as collateral");
    console.log("User collateral BP:", (await lendingPool.collateralBP(user.address)).toString());

    // 用户借出 ETH
    const maxBorrow = await lendingPool.maxBorrowable(user.address);
    await lendingPool.connect(user).borrow(maxBorrow);
    console.log("User borrowed", maxBorrow.toString(), "ETH");
    console.log("User debt ETH:", (await lendingPool.debtETH(user.address)).toString());
    console.log("User ETH balance:", (await user.getBalance()).toString());

    // 用户还款 ETH
    await lendingPool.connect(user).repay({ value: maxBorrow });
    console.log("User repaid", maxBorrow.toString(), "ETH");
    console.log("User debt ETH after repayment:", (await lendingPool.debtETH(user.address)).toString());
    console.log("User ETH balance after repayment:", (await user.getBalance()).toString());

    // 用户赎回 BP
    await lendingPool.connect(user).withdrawCollateral(100);
    console.log("User withdrew 100 BP");
    console.log("User collateral BP after withdrawal:", (await lendingPool.collateralBP(user.address)).toString());

    // 模拟价格下跌，设置 BP 价格为 0
    await lendingPool.setBPPrice(0);
    console.log("Set BP price to 0");

    // 清算用户
    await lendingPool.connect(liquidator).liquidate(user.address);
    console.log("User liquidated");
    console.log("User collateral BP after liquidation:", (await lendingPool.collateralBP(user.address)).toString());
  } catch (error) {
    console.error("Error during interaction:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 