# DeFi 借贷 DApp

Hi，欢迎来到我的 DeFi 借贷平台项目！  
这是一个用 React + Hardhat + ethers.js 实现的极简 AAVE/Compound 风格的去中心化借贷 DApp，支持 ETH 和自定义 BP 代币的双向抵押与借贷。  
**界面和交互以 AAVE 作为参考，是一个很基础的项目，适合学习、演示和二次开发。**

---

## ✨ 项目亮点

- **双资产支持**：ETH 和 BP 都能作为抵押和借贷资产
- **健康因子/清算机制**：完整的 DeFi 风险管理流程
- **AAVE 风格 UI**：紫色渐变、卡片分组、响应式，体验很丝滑
- **前后端全开源**：合约、前端、脚本一应俱全，方便本地测试和自定义

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Bestposs1ble/defi.git
cd defi-lending
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译合约

```bash
npx hardhat compile
```

### 4. 启动本地链（推荐 Hardhat 本地节点）

```bash
npx hardhat node
```

### 5. 部署合约

```bash
npx hardhat run scripts/deploy.js --network localhost
```

记下终端输出的 LendingPool 和 MyToken 合约地址，后面前端要用。

### 6. 启动前端

```bash
cd frontend
npm install
npm start
```

> 别忘了把 `frontend/src/App.jsx` 里的合约地址换成你刚刚部署的！

---

## 🧩 主要功能

- **存入/赎回**：ETH、BP 都能作为抵押品存入和赎回
- **借出/还款**：支持 ETH 和 BP 的借贷与还款
- **清算**：健康因子 < 1 时，任何人都可以清算风险账户，获得奖励
- **资产概览**：余额、抵押、债务、可借额度、可赎回额度、健康因子一目了然
- **AAVE 风格 UI**：分组卡片、渐变按钮、风险高亮、移动端自适应

---

## 🛠️ 目录结构

```
contracts/         # Solidity 合约
frontend/          # React 前端
scripts/           # 部署与交互脚本
test/              # 合约测试
```

---

## 📝 合约说明

- `MyToken.sol`：BP 代币合约（ERC20）
- `LendingPool.sol`：主借贷合约，支持双资产抵押、借贷、清算等全部核心逻辑

---

## 🧑‍💻 一些小Tips

- **本地测试**：用 Hardhat node 跑本地链，随便 mint BP 给自己玩
- **清算体验**：用两个账户，一个借爆仓，另一个清算，奖励直接到账
- **合约升级**：想支持更多资产、利率模型、部分清算等，可以在合约基础上扩展

---

## 📷 界面预览

![image](https://github.com/user-attachments/assets/8a885b58-9c89-45ff-beb6-61260a11527e)


---

## 🗣️ 联系我

如果你觉得这个项目有用，欢迎 star、fork、提 issue！  
有问题也可以直接联系我，欢迎一起交流 DeFi 技术和产品体验！
我的博客：https://bestpossible.space/
我的邮箱：hyc@bestpossible.com
