const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
  let myToken;
  let lendingPool;
  let owner;
  let user;
  let liquidator;

  beforeEach(async function () {
    [owner, user, liquidator] = await ethers.getSigners();

    // 部署 MyToken
    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy(1000000);
    await myToken.deployed();

    // 部署 LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(myToken.address);
    await lendingPool.deployed();

    // 给用户转一些 BP 代币
    await myToken.transfer(user.address, 1000);
    // 用户授权 LendingPool 使用 BP
    await myToken.connect(user).approve(lendingPool.address, 1000);
  });

  it("should allow user to deposit BP as collateral", async function () {
    await lendingPool.connect(user).depositCollateral(100);
    expect(await lendingPool.collateralBP(user.address)).to.equal(100);
  });

  it("should allow user to borrow ETH", async function () {
    await lendingPool.connect(user).depositCollateral(100);
    const maxBorrow = await lendingPool.maxBorrowable(user.address);
    await lendingPool.connect(user).borrow(maxBorrow);
    expect(await lendingPool.debtETH(user.address)).to.equal(maxBorrow);
  });

  it("should allow user to repay ETH", async function () {
    await lendingPool.connect(user).depositCollateral(100);
    const maxBorrow = await lendingPool.maxBorrowable(user.address);
    await lendingPool.connect(user).borrow(maxBorrow);
    await lendingPool.connect(user).repay({ value: maxBorrow });
    expect(await lendingPool.debtETH(user.address)).to.equal(0);
  });

  it("should allow user to withdraw BP after repayment", async function () {
    await lendingPool.connect(user).depositCollateral(100);
    const maxBorrow = await lendingPool.maxBorrowable(user.address);
    await lendingPool.connect(user).borrow(maxBorrow);
    await lendingPool.connect(user).repay({ value: maxBorrow });
    await lendingPool.connect(user).withdrawCollateral(100);
    expect(await lendingPool.collateralBP(user.address)).to.equal(0);
  });

  it("should allow liquidation if collateral value drops", async function () {
    await lendingPool.connect(user).depositCollateral(100);
    const maxBorrow = await lendingPool.maxBorrowable(user.address);
    await lendingPool.connect(user).borrow(maxBorrow);
    // 模拟价格下跌，设置 BP 价格为 0
    await lendingPool.setBPPrice(0);
    await lendingPool.connect(liquidator).liquidate(user.address);
    expect(await lendingPool.collateralBP(user.address)).to.equal(0);
  });
}); 