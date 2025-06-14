# DeFi Lending Platform

基于 BP 代币作为抵押，借出 ETH 的去中心化借贷平台，类似 Aave/Compound 的核心功能。

## 功能

- 存入 BP 作为抵押
- 借出 ETH
- 还款 ETH
- 赎回 BP
- 清算抵押率不足的用户

## 安装

1. 克隆项目
2. 安装依赖：
   ```bash
   npm install
   ```
3. 编译合约：
   ```bash
   npm run compile
   ```

## 测试

运行测试脚本：
```bash
npm test
```

## 部署

1. 启动本地链（如 Ganache）
2. 部署合约：
   ```bash
   npm run deploy
   ```
3. 将部署输出的合约地址填入 `.env` 文件：
   ```
   MYTOKEN_ADDRESS=your_mytoken_address_here
   LENDINGPOOL_ADDRESS=your_lendingpool_address_here
   ```

## 交互

运行交互脚本，演示合约功能：
```bash
npm run interact
```

## 合约说明

- `MyToken.sol`：BP 代币合约
- `LendingPool.sol`：借贷主合约，实现抵押、借贷、还款、赎回、清算等功能 