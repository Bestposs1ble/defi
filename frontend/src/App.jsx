console.log("App.jsx loaded");

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import LendingPoolABI from './utils/LendingPool.json';
import MyTokenABI from './utils/MyToken.json';
import './App.css';

// 请将下面地址替换为你本地部署的合约地址
const LENDING_POOL_ADDRESS = '0x20Ec2A852471CDa0659b75f56e9ca00BfbFb6BdF';
const MY_TOKEN_ADDRESS = '0xA631A02D485F892a5dDe5D01Ff9F0106A05f9cb4';

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [bpBalance, setBpBalance] = useState('0');
  const [collateral, setCollateral] = useState('0');
  const [debt, setDebt] = useState('0');
  const [maxBorrow, setMaxBorrow] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [poolEthBalance, setPoolEthBalance] = useState('0');
  const [input, setInput] = useState({ deposit: '', borrow: '', repay: '', withdraw: '', liquidate: '', depositETH: '' });
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      
      // 保存连接状态
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
    if (!signer || !lendingPool || !myToken) {
      console.log('fetchData: signer/lendingPool/myToken 未初始化');
      return;
    }
    try {
      console.log('fetchData called, account:', account);
      const bp = await myToken.balanceOf(account);
      setBpBalance(ethers.utils.formatUnits(bp, 18));
      setCollateral((await lendingPool.collateralBP(account)).toString());
      setDebt(ethers.utils.formatEther(await lendingPool.debtETH(account)));
      setMaxBorrow(ethers.utils.formatEther(await lendingPool.maxBorrowable(account)));
      setEthBalance(ethers.utils.formatEther(await provider.getBalance(account)));
      setPoolEthBalance(ethers.utils.formatEther(await lendingPool.poolETHBalance()));
      console.log('bpBalance', ethers.utils.formatUnits(bp, 18));
    } catch (e) {
      console.error('fetchData error:', e);
      setStatus('数据获取失败: ' + e.message);
    }
  }

  useEffect(() => {
    console.log('useEffect triggered', { signer, lendingPool, myToken });
    if (signer && lendingPool && myToken) {
      fetchData();
    }
  }, [signer, lendingPool, myToken]);

  // 监听账户和网络变化，自动刷新页面
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

  // 业务操作
  async function handleDeposit() {
    if (!myToken || !lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('授权中...');
      const tx1 = await myToken.approve(LENDING_POOL_ADDRESS, ethers.utils.parseUnits(input.deposit || '0', 18));
      await tx1.wait();
      setStatus('存入中...');
      const tx2 = await lendingPool.depositCollateral(ethers.utils.parseUnits(input.deposit || '0', 18));
      await tx2.wait();
      setStatus('存入成功');
      fetchData();
    } catch (e) { setStatus('存入失败: ' + e.message); }
  }
  async function handleBorrow() {
    if (!myToken || !lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('借款中...');
      const tx = await lendingPool.borrow(ethers.utils.parseEther(input.borrow || '0'));
      await tx.wait();
      setStatus('借款成功');
      fetchData();
    } catch (e) { setStatus('借款失败: ' + e.message); }
  }
  async function handleRepay() {
    if (!myToken || !lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('还款中...');
      const tx = await lendingPool.repay({ value: ethers.utils.parseEther(input.repay || '0') });
      await tx.wait();
      setStatus('还款成功');
      fetchData();
    } catch (e) { setStatus('还款失败: ' + e.message); }
  }
  async function handleWithdraw() {
    if (!myToken || !lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('赎回中...');
      const tx = await lendingPool.withdrawCollateral(ethers.utils.parseUnits(input.withdraw || '0', 18));
      await tx.wait();
      setStatus('赎回成功');
      fetchData();
    } catch (e) { setStatus('赎回失败: ' + e.message); }
  }
  async function handleLiquidate() {
    if (!myToken || !lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('清算中...');
      const tx = await lendingPool.liquidate(input.liquidate);
      await tx.wait();
      setStatus('清算成功');
      fetchData();
    } catch (e) { setStatus('清算失败: ' + e.message); }
  }
  async function handleDepositETH() {
    if (!lendingPool) {
      setStatus('请先连接钱包');
      return;
    }
    try {
      setStatus('存入ETH中...');
      const tx = await lendingPool.depositETH({ value: ethers.utils.parseEther(input.depositETH || '0') });
      await tx.wait();
      setStatus('存入ETH成功');
      fetchData();
    } catch (e) {
      setStatus('存入ETH失败: ' + e.message);
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
                <span>BP 余额:</span>
                <span>{bpBalance}</span>
              </div>
              <div className="balance-item">
                <span>ETH 余额:</span>
                <span>{ethBalance}</span>
              </div>
              <div className="balance-item">
                <span>已抵押 BP:</span>
                <span>{collateral}</span>
              </div>
              <div className="balance-item">
                <span>债务 ETH:</span>
                <span>{debt}</span>
              </div>
              <div className="balance-item">
                <span>最大可借 ETH:</span>
                <span>{maxBorrow}</span>
              </div>
              <div className="balance-item">
                <span>池子ETH余额:</span>
                <span>{poolEthBalance}</span>
              </div>
            </div>
          </div>

          <div className="action-cards">
            <div className="action-card">
              <h3>抵押操作</h3>
              <div className="input-group">
                <input 
                  type="number"
                  placeholder="存入BP数量" 
                  value={input.deposit} 
                  onChange={e => setInput({ ...input, deposit: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleDeposit} 
                  disabled={!myToken || !lendingPool}
                >
                  存入BP
                </button>
              </div>
              <div className="input-group">
                <input 
                  type="number"
                  placeholder="赎回BP数量" 
                  value={input.withdraw} 
                  onChange={e => setInput({ ...input, withdraw: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleWithdraw} 
                  disabled={!myToken || !lendingPool}
                >
                  赎回BP
                </button>
              </div>
            </div>

            <div className="action-card">
              <h3>借贷操作</h3>
              <div className="input-group">
                <input 
                  type="number"
                  placeholder="借出ETH数量" 
                  value={input.borrow} 
                  onChange={e => setInput({ ...input, borrow: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleBorrow} 
                  disabled={!myToken || !lendingPool}
                >
                  借出ETH
                </button>
              </div>
              <div className="input-group">
                <input 
                  type="number"
                  placeholder="还款ETH数量" 
                  value={input.repay} 
                  onChange={e => setInput({ ...input, repay: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleRepay} 
                  disabled={!myToken || !lendingPool}
                >
                  还款
                </button>
              </div>
            </div>

            <div className="action-card">
              <h3>其他操作</h3>
              <div className="input-group">
                <input 
                  type="number"
                  placeholder="存入ETH数量" 
                  value={input.depositETH} 
                  onChange={e => setInput({ ...input, depositETH: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleDepositETH} 
                  disabled={!lendingPool}
                >
                  存入ETH
                </button>
              </div>
              <div className="input-group">
                <input 
                  placeholder="清算用户地址" 
                  value={input.liquidate} 
                  onChange={e => setInput({ ...input, liquidate: e.target.value })} 
                />
                <button 
                  className="action-button"
                  onClick={handleLiquidate} 
                  disabled={!myToken || !lendingPool}
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