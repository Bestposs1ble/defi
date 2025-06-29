## 项目简介 | Project Introduction

这是一个基于以太坊的去中心化金融（DeFi）借贷协议，支持 ETH 与自定义代币 BP（BestPossible）的存款、借款、还款、清算等功能，并配有现代化前端界面，适合学习和二次开发。

This is a decentralized finance (DeFi) lending protocol built on Ethereum. It supports deposit, borrow, repay, and liquidation for both ETH and a custom token BP (BestPossible). The project includes a modern frontend, making it ideal for learning and secondary development.

---

## 功能亮点 | Features

- 支持 ETH 和 BP 代币的存款、借款、还款、清算  
  Supports deposit, borrow, repay, and liquidation for ETH and BP token
- 动态利率、LTV、清算阈值等参数可配置  
  Configurable parameters: interest rates, LTV, liquidation threshold, etc.
- 前端集成钱包连接（MetaMask），实时显示资产、负债、健康因子等信息  
  Frontend with MetaMask integration, real-time display of assets, debts, health factor, etc.
- 一键清算高风险账户，保障资金安全  
  One-click liquidation for risky accounts to ensure fund safety
- 完善的合约测试与部署脚本  
  Complete contract tests and deployment scripts

---

## 快速开始 | Quick Start

### 1. 克隆项目 | Clone the repo

```bash
git clone https://github.com/你的用户名/defi-lendingpool.git
cd defi-lendingpool
```

### 2. 安装依赖 | Install dependencies

```bash
npm install
cd frontend
npm install
```

### 3. 部署合约 | Deploy contracts

```bash
npx hardhat run scripts/deploy.js --network <network>
```

### 4. 启动前端 | Start frontend

```bash
cd frontend
npm run dev
```

### 5. 体验功能 | Try the features

- 连接钱包（MetaMask） | Connect your wallet (MetaMask)
- 存入 ETH 或 BP 作为抵押 | Deposit ETH or BP as collateral
- 借出 ETH 或 BP | Borrow ETH or BP
- 还款 | Repay
- 清算健康因子过低的账户 | Liquidate accounts with low health factor

---

## 合约说明 | Contract Overview

### LendingPool.sol

- 支持多资产的借贷与抵押  
  Multi-asset lending and collateral
- 动态配置 LTV、清算阈值、利率等  
  Dynamic configuration of LTV, liquidation threshold, interest rates, etc.
- 存款、借款、还款、清算等核心功能  
  Core functions: deposit, borrow, repay, liquidation
- 健康因子机制，防止超额借贷  
  Health factor mechanism to prevent over-borrowing

### MyToken.sol

- 标准 ERC20 代币，名称 BestPossible，符号 BP  
  Standard ERC20 token, name: BestPossible, symbol: BP
- 初始总量由部署时指定  
  Initial supply set at deployment

---

## 前端说明 | Frontend

- React + Vite 构建  
  Built with React + Vite
- 支持钱包连接、资产展示、交互操作  
  Supports wallet connection, asset display, and interactive operations
- 实时反馈操作状态与链上数据  
  Real-time feedback and on-chain data



## 📷 界面预览

![image](https://github.com/user-attachments/assets/8a885b58-9c89-45ff-beb6-61260a11527e)


---

## 🗣️ 联系我

如果你觉得这个项目有用，欢迎 star、fork、提 issue！  
有问题也可以直接联系我，欢迎一起交流 DeFi 技术和产品体验！
我的博客：https://bestpossible.space/
我的邮箱：hyc@bestpossible.space
