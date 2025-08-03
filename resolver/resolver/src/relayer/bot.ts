import { EthereumContracts } from '../ethereum/contracts';
import { NEARContracts } from '../near/contracts';
import { SecretManager } from './secret-manager';
import { config } from 'dotenv';

config();

export class FusionRelayerBot {
  private ethContracts: EthereumContracts;
  private nearContracts: NEARContracts;
  private secretManager: SecretManager;

  constructor() {
    // Initialize secret manager (in-memory)
    this.secretManager = new SecretManager();
    
    this.ethContracts = new EthereumContracts(
      process.env.ETHEREUM_RPC_URL!,
      process.env.ETHEREUM_PRIVATE_KEY!
    );
    
    this.nearContracts = new NEARContracts(
      process.env.NEAR_RPC_URL!,
      process.env.NEAR_ACCOUNT_ID!,
      process.env.NEAR_FUSION_CONTRACT!
    );
  }

  async initialize() {
    console.log('🚀 Initializing Fusion NEAR Relayer Bot...');
    
    // Check wallet balances
    const ethInfo = await this.ethContracts.getWalletInfo();
    const nearInfo = await this.nearContracts.getAccountInfo();
    
    console.log('💰 Wallet Status:');
    console.log(`   Ethereum: ${ethInfo.address} (${ethInfo.ethBalance} ETH, ${ethInfo.usdcBalance} USDC)`);
    console.log(`   NEAR: ${nearInfo?.accountId} (${nearInfo?.balance} NEAR)`);
    
    // Initialize in-memory storage
    console.log('🧠 Secret manager initialized (in-memory storage)');
    
    console.log('✅ Bot initialized successfully');
  }

  async start() {
    console.log('🔄 Starting relayer bot...');
    
    // Start listening for Ethereum orders
    await this.ethContracts.listenForOrders((orderHash) => {
      this.handleNewOrder(orderHash);
    });
    
    // Start monitoring NEAR claims
    await this.nearContracts.monitorClaims((orderHash, secret) => {
      this.handleClaimDetected(orderHash, secret);
    });
    
    console.log('✅ Relayer bot started successfully');
    console.log('📡 Monitoring both chains for activity...');
  }

  private async handleNewOrder(orderHash: string) {
    console.log(`\n📦 New order detected: ${orderHash.slice(0, 10)}...`);
    
    try {
      // Store order with generated secret (mock data for now)
      const secretInfo = this.secretManager.storeOrder(orderHash, {
        maker: '0x' + '1'.repeat(40), // Mock maker address
        taker: process.env.ETHEREUM_PRIVATE_KEY ? 
          new (await import('ethers')).ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY).address : 
          '0x' + '2'.repeat(40),
        srcChain: 'ethereum',
        dstChain: 'near',
        srcToken: process.env.ETHEREUM_USDC!,
        dstToken: 'wrap.testnet',
        srcAmount: '1000000', // 1 USDC
        dstAmount: '1000000000000000000000000', // 1 wNEAR
        timelockSrc: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        timelockDst: Math.floor(Date.now() / 1000) + 1800  // 30 minutes
      });
      
      console.log(`🔑 Ready to create NEAR escrow with hash: ${secretInfo.secretHash.slice(0, 10)}...`);
      
      // TODO: Actually create NEAR escrow here
      // await this.nearContracts.createEscrow(orderHash, secretInfo.secretHash, ...)
      
      // For now, simulate creating escrow after 5 seconds
      setTimeout(() => {
        this.secretManager.updateOrderStatus(orderHash, 'escrow_created');
        console.log(`✅ NEAR escrow created for order: ${orderHash.slice(0, 10)}...`);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error handling new order:', error);
    }
  }

  private async handleClaimDetected(orderHash: string, secret: string) {
    console.log(`\n🔓 Claim detected: ${orderHash.slice(0, 10)}...`);
    console.log(`🔑 Secret revealed: ${secret.slice(0, 10)}...`);
    
    try {
      // Verify the secret matches what we stored
      const isValid = this.secretManager.verifyRevealedSecret(orderHash, secret);
      
      if (isValid) {
        // Update status to claimed
        this.secretManager.updateOrderStatus(orderHash, 'claimed');
        
        // TODO: Use the secret to claim on Ethereum
        console.log(`💰 Ready to claim Ethereum escrow with secret: ${secret.slice(0, 10)}...`);
        
        // Simulate claiming after 3 seconds
        setTimeout(() => {
          this.secretManager.updateOrderStatus(orderHash, 'completed');
          console.log(`✅ Order completed: ${orderHash.slice(0, 10)}...`);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error handling claim:', error);
    }
  }

  async getStatus() {
    const summary = this.secretManager.getSummary();
    return {
      activeOrders: summary.active,
      totalOrders: summary.totalOrders,
      breakdown: {
        detected: summary.detected,
        escrowCreated: summary.escrowCreated,
        claimed: summary.claimed,
        completed: summary.completed,
        cancelled: summary.cancelled
      },
      recentOrders: summary.orders
    };
  }

  // Method to manually create a test order (for testing)
  async createTestOrder(): Promise<string> {
    const testOrderHash = '0x' + Date.now().toString(16).padStart(64, '0');
    await this.handleNewOrder(testOrderHash);
    return testOrderHash;
  }

  // Method to manually simulate a claim (for testing)
  async simulateClaim(orderHash: string): Promise<void> {
    const secret = this.secretManager.getSecret(orderHash);
    if (secret) {
      await this.handleClaimDetected(orderHash, secret);
    } else {
      console.log(`❌ No secret found for order: ${orderHash}`);
    }
  }
}