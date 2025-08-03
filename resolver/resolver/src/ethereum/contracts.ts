import { ethers } from 'ethers';

export class EthereumContracts {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  // 1inch Limit Order Protocol - the main contract
  getLimitOrderProtocol() {
    const LOP_ABI = [
      // Basic order filling function
      'function fillOrderArgs(tuple(uint256,address,address,address,address,uint256,uint256,bytes) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256, uint256, bytes32)',
      
      // Events we need to listen to
      'event OrderFilled(bytes32 indexed orderHash, uint256 remaining)',
      'event OrderCancelled(bytes32 indexed orderHash)'
    ];
    
    return new ethers.Contract(
      '0x111111125421ca6dc452d289314280a0f8842a65',
      LOP_ABI,
      this.wallet
    );
  }

  // Get USDC contract for testing
  getUSDCContract() {
    const ERC20_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ];
    
    return new ethers.Contract(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ERC20_ABI,
      this.wallet
    );
  }

  // Listen for new 1inch orders (we'll enhance this)
  async listenForOrders(callback: (orderHash: string) => void) {
    const lop = this.getLimitOrderProtocol();
    
    lop.on('OrderFilled', (orderHash, remaining, event) => {
      console.log(`📦 New order filled: ${orderHash}`);
      callback(orderHash);
    });
    
    console.log('👂 Listening for Ethereum orders...');
  }

  async getWalletInfo() {
    const balance = await this.provider.getBalance(this.wallet.address);
    const usdcBalance = await this.getUSDCContract().balanceOf(this.wallet.address);
    
    return {
      address: this.wallet.address,
      ethBalance: ethers.formatEther(balance),
      usdcBalance: usdcBalance.toString()
    };
  }
}