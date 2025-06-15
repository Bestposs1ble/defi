// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./MyToken.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingPool is ReentrancyGuard, Pausable, Ownable {
    MyToken public bpToken;
    
    // 资产配置结构
    struct AssetConfig {
        uint256 ltv;           // 贷款价值比 (如 75% = 7500)
        uint256 liquidationThreshold; // 清算阈值 (如 80% = 8000)
        uint256 liquidationBonus;     // 清算奖励 (如 5% = 500)
        uint256 borrowRate;    // 借款利率 (如 5% = 500)
        uint256 depositRate;   // 存款利率 (如 3% = 300)
        bool isActive;         // 资产是否激活
    }

    // 用户资产状态
    struct UserAssetState {
        uint256 collateral;    // 抵押数量
        uint256 debt;          // 债务数量
        uint256 lastUpdateTime; // 最后更新时间
    }

    // 资产配置映射
    mapping(address => AssetConfig) public assetConfigs;
    // 用户资产状态映射 (用户地址 => 资产地址 => 状态)
    mapping(address => mapping(address => UserAssetState)) public userAssetStates;
    // 资产总供应量
    mapping(address => uint256) public totalSupplies;
    // 资产总借贷量
    mapping(address => uint256) public totalBorrows;
    // 资产价格 (18位精度)
    mapping(address => uint256) public assetPrices;

    // 事件
    event AssetConfigUpdated(address indexed asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus);
    event PriceUpdated(address indexed asset, uint256 oldPrice, uint256 newPrice);
    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event Liquidate(address indexed user, address indexed asset, address indexed liquidator, uint256 amount);

    constructor(address _bpToken) {
        bpToken = MyToken(_bpToken);
        
        // 初始化 ETH 配置
        assetConfigs[address(0)] = AssetConfig({
            ltv: 8000,              // 80%
            liquidationThreshold: 8250, // 82.5%
            liquidationBonus: 500,      // 5%
            borrowRate: 500,           // 5%
            depositRate: 300,          // 3%
            isActive: true
        });

        // 初始化 BP 配置
        assetConfigs[_bpToken] = AssetConfig({
            ltv: 7500,              // 75%
            liquidationThreshold: 8000, // 80%
            liquidationBonus: 500,      // 5%
            borrowRate: 600,           // 6%
            depositRate: 400,          // 4%
            isActive: true
        });

        // 设置初始价格
        assetPrices[address(0)] = 1e18;  // 1 ETH = 1 ETH
        assetPrices[_bpToken] = 1e16;    // 1 BP = 0.01 ETH
    }

    // 管理员函数
    function setAssetConfig(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        uint256 borrowRate,
        uint256 depositRate
    ) external onlyOwner {
        require(ltv <= 9000, "LTV too high");
        require(liquidationThreshold > ltv, "Invalid liquidation threshold");
        require(liquidationBonus <= 1000, "Bonus too high");
        
        assetConfigs[asset] = AssetConfig({
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus,
            borrowRate: borrowRate,
            depositRate: depositRate,
            isActive: true
        });
        
        emit AssetConfigUpdated(asset, ltv, liquidationThreshold, liquidationBonus);
    }

    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        emit PriceUpdated(asset, assetPrices[asset], price);
        assetPrices[asset] = price;
    }

    // 用户函数
    function deposit(address asset, uint256 amount) external payable nonReentrant whenNotPaused {
        require(assetConfigs[asset].isActive, "Asset not active");
        if (asset == address(0)) {
            require(msg.value > 0, "Amount must be > 0");
            amount = msg.value;
        } else {
            require(amount > 0, "Amount must be > 0");
            require(msg.value == 0, "Do not send ETH when depositing ERC20");
            require(IERC20(asset).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        }

        UserAssetState storage state = userAssetStates[msg.sender][asset];
        state.collateral += amount;
        totalSupplies[asset] += amount;

        emit Deposit(msg.sender, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        UserAssetState storage state = userAssetStates[msg.sender][asset];
        require(state.collateral >= amount, "Insufficient collateral");

        // 检查健康因子
        require(getHealthFactor(msg.sender) >= 1e18, "Health factor too low");

        state.collateral -= amount;
        totalSupplies[asset] -= amount;

        if (asset == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            require(IERC20(asset).transfer(msg.sender, amount), "Transfer failed");
        }

        emit Withdraw(msg.sender, asset, amount);
    }

    function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(assetConfigs[asset].isActive, "Asset not active");

        // 检查借贷限额
        uint256 available = getBorrowableAmount(msg.sender, asset);
        require(amount <= available, "Exceeds borrow limit");

        UserAssetState storage state = userAssetStates[msg.sender][asset];
        state.debt += amount;
        totalBorrows[asset] += amount;

        if (asset == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            require(IERC20(asset).transfer(msg.sender, amount), "Transfer failed");
        }

        emit Borrow(msg.sender, asset, amount);
    }

    function repay(address asset) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "No value sent");
        UserAssetState storage state = userAssetStates[msg.sender][asset];
        require(state.debt > 0, "No debt");

        uint256 repayAmount = msg.value;
        if (repayAmount > state.debt) {
            repayAmount = state.debt;
        }

        state.debt -= repayAmount;
        totalBorrows[asset] -= repayAmount;

        emit Repay(msg.sender, asset, repayAmount);
    }

    function liquidate(
        address user,
        address collateralAsset,
        address debtAsset
    ) external nonReentrant whenNotPaused {
        require(getHealthFactor(user) < 1e18, "User is healthy");
        
        UserAssetState storage collateralState = userAssetStates[user][collateralAsset];
        UserAssetState storage debtState = userAssetStates[user][debtAsset];
        
        require(collateralState.collateral > 0, "No collateral");
        require(debtState.debt > 0, "No debt");

        uint256 collateralAmount = collateralState.collateral;
        uint256 debtAmount = debtState.debt;
        uint256 bonus = collateralAmount * assetConfigs[collateralAsset].liquidationBonus / 10000;

        // 转移抵押品
        collateralState.collateral = 0;
        debtState.debt = 0;
        totalSupplies[collateralAsset] -= collateralAmount;
        totalBorrows[debtAsset] -= debtAmount;

        // 发送清算奖励
        if (collateralAsset == address(0)) {
            payable(msg.sender).transfer(collateralAmount + bonus);
        } else {
            require(IERC20(collateralAsset).transfer(msg.sender, collateralAmount + bonus), "Transfer failed");
        }

        emit Liquidate(user, collateralAsset, debtAsset, collateralAmount);
    }

    // 视图函数
    function getHealthFactor(address user) public view returns (uint256) {
        uint256 totalCollateralValue = 0;
        uint256 totalDebtValue = 0;

        // 计算总抵押价值
        for (uint i = 0; i < 2; i++) {
            address asset = i == 0 ? address(0) : address(bpToken);
            UserAssetState storage state = userAssetStates[user][asset];
            if (state.collateral > 0) {
                totalCollateralValue += state.collateral * assetPrices[asset] * assetConfigs[asset].liquidationThreshold / 1e18 / 10000;
            }
        }

        // 计算总债务价值
        for (uint i = 0; i < 2; i++) {
            address asset = i == 0 ? address(0) : address(bpToken);
            UserAssetState storage state = userAssetStates[user][asset];
            if (state.debt > 0) {
                totalDebtValue += state.debt * assetPrices[asset] / 1e18;
            }
        }

        if (totalDebtValue == 0) return type(uint256).max;
        return totalCollateralValue * 1e18 / totalDebtValue;
    }

    function getBorrowableAmount(address user, address asset) public view returns (uint256) {
        uint256 totalCollateralValue = 0;
        uint256 totalDebtValue = 0;

        // 计算总抵押价值
        for (uint i = 0; i < 2; i++) {
            address collateralAsset = i == 0 ? address(0) : address(bpToken);
            UserAssetState storage state = userAssetStates[user][collateralAsset];
            if (state.collateral > 0) {
                totalCollateralValue += state.collateral * assetPrices[collateralAsset] * assetConfigs[collateralAsset].ltv / 1e18 / 10000;
            }
        }

        // 计算总债务价值
        for (uint i = 0; i < 2; i++) {
            address debtAsset = i == 0 ? address(0) : address(bpToken);
            UserAssetState storage state = userAssetStates[user][debtAsset];
            if (state.debt > 0) {
                totalDebtValue += state.debt * assetPrices[debtAsset] / 1e18;
            }
        }

        if (totalCollateralValue <= totalDebtValue) return 0;
        uint256 theoretical = (totalCollateralValue - totalDebtValue) * 1e18 / assetPrices[asset];

        // 加入池子实际余额限制
        uint256 availableLiquidity = asset == address(0) ? address(this).balance : IERC20(asset).balanceOf(address(this));
        return theoretical < availableLiquidity ? theoretical : availableLiquidity;
    }

    // 接收ETH
    receive() external payable {}
}
