console.log("App.jsx loaded");

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import LendingPoolABI from './utils/LendingPool.json';
import MyTokenABI from './utils/MyToken.json';
import './App.css';

// 请将下面地址替换为你本地部署的合约地址
const LENDING_POOL_ADDRESS = '0x35A69924BA997583D0150819F35766FB32c76049';
const MY_TOKEN_ADDRESS = '0x1091BedD8D5Dd191eBfdA2e1bcD89ddc4B792C22';

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, borrow, repay, withdraw

  // 资产状态
  const [ethBalance, setEthBalance] = useState('0');
  const [bpBalance, setBpBalance] = useState('0');
  const [ethCollateral, setEthCollateral] = useState('0');
  const [bpCollateral, setBpCollateral] = useState('0');
  const [ethDebt, setEthDebt] = useState('0');
  const [bpDebt, setBpDebt] = useState('0');
  const [healthFactor, setHealthFactor] = useState('0');
  const [ethBorrowable, setEthBorrowable] = useState('0');
  const [bpBorrowable, setBpBorrowable] = useState('0');
  const [selectedAsset, setSelectedAsset] = useState('ETH');

  // 输入状态
  const [input, setInput] = useState({
    amount: '',
    liquidateUser: '',
    liquidateCollateral: '',
    liquidateDebt: ''
  });

  // 合约实例
  const [lendingPool, setLendingPool] = useState(null);
  const [myToken, setMyToken] = useState(null);

  // 检查本地存储的钱包连接状态
  useEffect(() => {
    const checkConnection = async () => {
      const savedAccount = localStorage.getItem('connectedAccount');
      if (savedAccount) {
        await connectWallet();
      }
    };
    checkConnection();
  }, []);

  // 钱包连接
  async function connectWallet() {
    try {
      setIsLoading(true);
      const ethProvider = await detectEthereumProvider();
      if (!ethProvider) {
        setStatus('请先安装 MetaMask');
        return;
      }
      await ethProvider.request({ method: 'eth_requestAccounts' });
      const ethersProvider = new ethers.providers.Web3Provider(ethProvider);
      const signer = ethersProvider.getSigner();
      const account = await signer.getAddress();
      
      localStorage.setItem('connectedAccount', account);
      
      setProvider(ethersProvider);
      setSigner(signer);
      setAccount(account);
      
      const lendingPoolInstance = new ethers.Contract(LENDING_POOL_ADDRESS, LendingPoolABI.abi, signer);
      const myTokenInstance = new ethers.Contract(MY_TOKEN_ADDRESS, MyTokenABI.abi, signer);
      setLendingPool(lendingPoolInstance);
      setMyToken(myTokenInstance);
      setStatus('钱包已连接');
    } catch (error) {
      setStatus('连接失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // 断开钱包连接
  const disconnectWallet = () => {
    localStorage.removeItem('connectedAccount');
    setAccount('');
    setProvider(null);
    setSigner(null);
    setLendingPool(null);
    setMyToken(null);
    setStatus('钱包已断开连接');
  };

  // 查询链上数据
  async function fetchData() {
    if (!signer || !lendingPool || !myToken) return;
    
    try {
      // 获取余额
      const ethBal = await provider.getBalance(account);
      const bpBal = await myToken.balanceOf(account);
      setEthBalance(ethers.utils.formatEther(ethBal));
      setBpBalance(ethers.utils.formatUnits(bpBal, 18));

      // 获取抵押品
      const ethColl = await lendingPool.userAssetStates(account, ethers.constants.AddressZero);
      const bpColl = await lendingPool.userAssetStates(account, MY_TOKEN_ADDRESS);
      setEthCollateral(ethers.utils.formatEther(ethColl.collateral));
      setBpCollateral(ethers.utils.formatUnits(bpColl.collateral, 18));

      // 获取债务
      setEthDebt(ethers.utils.formatEther(ethColl.debt));
      setBpDebt(ethers.utils.formatUnits(bpColl.debt, 18));

      // 获取健康因子
      const health = await lendingPool.getHealthFactor(account);
      let healthNum = ethers.utils.formatUnits(health, 18);
      // 如果健康因子极大（如无债务），显示为 ∞
      if (health.gt(ethers.constants.MaxUint256.div(2))) {
        healthNum = '∞';
      }
      setHealthFactor(healthNum);

      // 获取可借额度
      const ethBorrow = await lendingPool.getBorrowableAmount(account, ethers.constants.AddressZero);
      const bpBorrow = await lendingPool.getBorrowableAmount(account, MY_TOKEN_ADDRESS);
      setEthBorrowable(ethers.utils.formatEther(ethBorrow));
      setBpBorrowable(ethers.utils.formatUnits(bpBorrow, 18));
    } catch (e) {
      console.error('数据获取失败:', e);
      setStatus('数据获取失败: ' + e.message);
    }
  }

  useEffect(() => {
    if (signer && lendingPool && myToken) {
      fetchData();
    }
  }, [signer, lendingPool, myToken]);

  // 监听账户和网络变化
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => {
        window.location.reload();
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // 处理资产操作
  async function handleAssetOperation() {
    if (!lendingPool) {
      setStatus('请先连接钱包');
      return;
    }

    try {
      const amount = selectedAsset === 'ETH' ? 
        ethers.utils.parseEther(input.amount || '0') :
        ethers.utils.parseUnits(input.amount || '0', 18);

      if (amount.lte(0)) {
        setStatus('请输入大于0的数量');
        return;
      }

      const assetAddress = selectedAsset === 'ETH' ? 
        ethers.constants.AddressZero : MY_TOKEN_ADDRESS;

      switch (activeTab) {
        case 'deposit':
          if (selectedAsset === 'ETH') {
            setStatus('存入ETH中...');
            const tx = await lendingPool.deposit(assetAddress, { value: amount });
            await tx.wait();
            setStatus('存入ETH成功');
          } else {
            // 检查余额
            const balance = await myToken.balanceOf(account);
            if (balance.lt(amount)) {
              setStatus('BP余额不足');
              return;
            }

            setStatus('授权中...');
            const tx1 = await myToken.approve(LENDING_POOL_ADDRESS, amount);
            await tx1.wait();

            setStatus('存入BP中...');
            const tx2 = await lendingPool.deposit(assetAddress, amount);
            await tx2.wait();
            setStatus('存入BP成功');
          }
          break;

        case 'withdraw':
          setStatus('赎回中...');
          const tx = await lendingPool.withdraw(assetAddress, amount);
          await tx.wait();
          setStatus('赎回成功');
          break;

        case 'borrow':
          if (selectedAsset === 'ETH' && amount.gt(ethers.utils.parseEther(ethBorrowable))) {
            setStatus(`超出可借额度，最大可借: ${ethBorrowable} ETH`);
            return;
          }
          if (selectedAsset === 'BP' && amount.gt(ethers.utils.parseUnits(bpBorrowable, 18))) {
            setStatus(`超出可借额度，最大可借: ${bpBorrowable} BP`);
            return;
          }

          setStatus('借出中...');
          const borrowTx = await lendingPool.borrow(assetAddress, amount);
          await borrowTx.wait();
          setStatus('借出成功');
          break;

        case 'repay':
          if (selectedAsset === 'ETH') {
            setStatus('还款ETH中...');
            const repayTx = await lendingPool.repay(assetAddress, { value: amount });
            await repayTx.wait();
            setStatus('还款ETH成功');
          } else {
            // 检查余额
            const balance = await myToken.balanceOf(account);
            if (balance.lt(amount)) {
              setStatus('BP余额不足');
              return;
            }

            setStatus('授权中...');
            const tx1 = await myToken.approve(LENDING_POOL_ADDRESS, amount);
            await tx1.wait();

            setStatus('还款BP中...');
            const tx2 = await lendingPool.repay(assetAddress, amount);
            await tx2.wait();
            setStatus('还款BP成功');
          }
          break;
      }

      fetchData();
      setInput({ ...input, amount: '' });
    } catch (e) {
      console.error('操作失败:', e);
      if (e.code === 4001) {
        setStatus('用户取消了交易');
      } else if (e.message.includes('insufficient funds')) {
        setStatus(`${selectedAsset}余额不足`);
      } else if (e.message.includes('Health factor too low')) {
        setStatus('健康因子过低，无法操作');
      } else if (e.message.includes('Exceeds borrow limit')) {
        setStatus('超出借款限额');
      } else {
        setStatus('操作失败: ' + e.message);
      }
    }
  }

  async function handleLiquidate() {
    if (!lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      if (!ethers.utils.isAddress(input.liquidateUser)) {
        setStatus('请输入有效的地址');
        return;
      }

      const collateralAsset = input.liquidateCollateral === 'ETH' ? 
        ethers.constants.AddressZero : MY_TOKEN_ADDRESS;
      const debtAsset = input.liquidateDebt === 'ETH' ? 
        ethers.constants.AddressZero : MY_TOKEN_ADDRESS;

      setStatus('清算中...');
      const tx = await lendingPool.liquidate(
        input.liquidateUser,
        collateralAsset,
        debtAsset
      );
      await tx.wait();
      setStatus('清算成功');
      fetchData();
    } catch (e) {
      console.error('清算失败:', e);
      if (e.code === 4001) {
        setStatus('用户取消了交易');
      } else if (e.message.includes('User is healthy')) {
        setStatus('该用户不符合清算条件');
      } else {
        setStatus('清算失败: ' + e.message);
      }
    }
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>DeFi 借贷 DApp</h1>
        <div className="wallet-section">
          {!account ? (
            <button 
              className="connect-button" 
              onClick={connectWallet} 
              disabled={isLoading}
            >
              {isLoading ? '连接中...' : '连接钱包'}
            </button>
          ) : (
            <div className="wallet-info">
              <span className="account-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <button className="disconnect-button" onClick={disconnectWallet}>
                断开连接
              </button>
            </div>
          )}
        </div>
      </div>

      {account && (
        <div className="main-content">
          <div className="balance-cards">
            <div className="balance-card">
              <h3>资产概览</h3>
              <div className="balance-item">
                <span>ETH 余额:</span>
                <span>{ethBalance}</span>
              </div>
              <div className="balance-item">
                <span>BP 余额:</span>
                <span>{bpBalance}</span>
              </div>
              <div className="balance-item">
                <span>ETH 抵押:</span>
                <span>{ethCollateral}</span>
              </div>
              <div className="balance-item">
                <span>BP 抵押:</span>
                <span>{bpCollateral}</span>
              </div>
              <div className="balance-item">
                <span>ETH 债务:</span>
                <span>{ethDebt}</span>
              </div>
              <div className="balance-item">
                <span>BP 债务:</span>
                <span>{bpDebt}</span>
              </div>
              <div className="balance-item">
                <span>健康因子:</span>
                <span>{healthFactor}</span>
              </div>
              <div className="balance-item">
                <span>可借 ETH:</span>
                <span>{ethBorrowable}</span>
              </div>
              <div className="balance-item">
                <span>可借 BP:</span>
                <span>{bpBorrowable}</span>
              </div>
            </div>
          </div>

          <div className="action-cards">
            <div className="action-card">
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
                  onClick={() => setActiveTab('deposit')}
                >
                  存入
                </button>
                <button 
                  className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`}
                  onClick={() => setActiveTab('withdraw')}
                >
                  赎回
                </button>
                <button 
                  className={`tab ${activeTab === 'borrow' ? 'active' : ''}`}
                  onClick={() => setActiveTab('borrow')}
                >
                  借出
                </button>
                <button 
                  className={`tab ${activeTab === 'repay' ? 'active' : ''}`}
                  onClick={() => setActiveTab('repay')}
                >
                  还款
                </button>
              </div>

              <div className="asset-selector">
                <button 
                  className={`asset-button ${selectedAsset === 'ETH' ? 'active' : ''}`}
                  onClick={() => setSelectedAsset('ETH')}
                >
                  ETH
                </button>
                <button 
                  className={`asset-button ${selectedAsset === 'BP' ? 'active' : ''}`}
                  onClick={() => setSelectedAsset('BP')}
                >
                  BP
                </button>
              </div>

              <div className="input-group">
                <input 
                  type="number"
                  placeholder={`${activeTab === 'deposit' ? '存入' : 
                    activeTab === 'withdraw' ? '赎回' : 
                    activeTab === 'borrow' ? '借出' : '还款'}${selectedAsset}数量`}
                  value={input.amount}
                  onChange={e => setInput({ ...input, amount: e.target.value })}
                />
                <button 
                  className="action-button"
                  onClick={handleAssetOperation}
                  disabled={!lendingPool}
                >
                  {activeTab === 'deposit' ? '存入' : 
                   activeTab === 'withdraw' ? '赎回' : 
                   activeTab === 'borrow' ? '借出' : '还款'}
                </button>
              </div>
            </div>

            <div className="action-card">
              <h3>清算操作</h3>
              <div className="input-group">
                <input 
                  placeholder="清算用户地址" 
                  value={input.liquidateUser} 
                  onChange={e => setInput({ ...input, liquidateUser: e.target.value })} 
                />
                <select
                  value={input.liquidateCollateral}
                  onChange={e => setInput({ ...input, liquidateCollateral: e.target.value })}
                >
                  <option value="">选择抵押品</option>
                  <option value="ETH">ETH</option>
                  <option value="BP">BP</option>
                </select>
                <select
                  value={input.liquidateDebt}
                  onChange={e => setInput({ ...input, liquidateDebt: e.target.value })}
                >
                  <option value="">选择债务</option>
                  <option value="ETH">ETH</option>
                  <option value="BP">BP</option>
                </select>
                <button 
                  className="action-button"
                  onClick={handleLiquidate} 
                  disabled={!lendingPool}
                >
                  清算
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className={`status-message ${status.includes('成功') ? 'success' : status.includes('失败') ? 'error' : 'info'}`}>
          {status}
        </div>
      )}
    </div>
  );
} 