// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./MyToken.sol";

contract LendingPool {
    MyToken public bpToken;
    address public owner;

    // 用户抵押的BP数量
    mapping(address => uint256) public collateralBP;
    // 用户借出的ETH数量
    mapping(address => uint256) public debtETH;
    // 用户存入的ETH数量
    mapping(address => uint256) public ethDeposits;

    // BP/ETH 价格（18位精度），如 0.01 ETH = 1e16
    uint256 public bpPriceInETH;

    // 抵押率（如150%，则为150）
    uint256 public constant COLLATERAL_RATE = 150;

    constructor(address _bpToken) {
        bpToken = MyToken(_bpToken);
        owner = msg.sender;
        bpPriceInETH = 1e16; // 初始价格 0.01 ETH
    }

    // 仅管理员可设置价格
    function setBPPrice(uint256 _price) external {
        require(msg.sender == owner, "Not owner");
        bpPriceInETH = _price;
    }

    // 存入BP
    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(bpToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        collateralBP[msg.sender] += amount;
    }

    // 计算最大可借ETH
    function maxBorrowable(address user) public view returns (uint256) {
        uint256 collateralValue = collateralBP[user] * bpPriceInETH / 1e18;
        return collateralValue * 100 / COLLATERAL_RATE;
    }

    // 借出ETH
    function borrow(uint256 ethAmount) external {
        require(ethAmount > 0, "Amount must be > 0");
        uint256 available = maxBorrowable(msg.sender) - debtETH[msg.sender];
        require(ethAmount <= available, "Exceeds borrow limit");
        debtETH[msg.sender] += ethAmount;
        payable(msg.sender).transfer(ethAmount);
    }

    // 还款ETH
    function repay() external payable {
        require(debtETH[msg.sender] > 0, "No debt");
        require(msg.value > 0, "No ETH sent");
        uint256 payAmount = msg.value;
        if (payAmount > debtETH[msg.sender]) {
            payAmount = debtETH[msg.sender];
        }
        debtETH[msg.sender] -= payAmount;
        // 多余ETH不退回，实际应用可优化
    }

    // 赎回BP
    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        // 赎回后抵押品价值需覆盖剩余债务
        uint256 afterWithdraw = collateralBP[msg.sender] - amount;
        uint256 maxDebt = (afterWithdraw * bpPriceInETH / 1e18) * 100 / COLLATERAL_RATE;
        require(debtETH[msg.sender] <= maxDebt, "Debt too high after withdraw");
        collateralBP[msg.sender] -= amount;
        require(bpToken.transfer(msg.sender, amount), "Transfer failed");
    }

    // 清算
    function liquidate(address user) external {
        // 当前抵押品价值
        uint256 collateralValue = collateralBP[user] * bpPriceInETH / 1e18;
        uint256 requiredCollateral = debtETH[user] * COLLATERAL_RATE / 100;
        require(collateralValue < requiredCollateral, "Not eligible for liquidation");
        // 清算奖励10%
        uint256 reward = collateralBP[user] / 10;
        // 剩余BP归合约
        collateralBP[user] = 0;
        debtETH[user] = 0;
        require(bpToken.transfer(msg.sender, reward), "Reward transfer failed");
        // 剩余BP归合约/平台
    }

    // 存入ETH
    function depositETH() external payable {
        require(msg.value > 0, "No ETH sent");
        ethDeposits[msg.sender] += msg.value;
    }

    // 查询池子ETH余额
    function poolETHBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // 合约可接收ETH
    receive() external payable {}
}
