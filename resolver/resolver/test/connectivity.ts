import { ethers } from 'ethers';
import { JsonRpcProvider } from '@near-js/providers';
import { config } from 'dotenv';

config();

class ConnectivityTest {
  async testEthereum() {
    console.log('🔍 Testing Ethereum connection...');
    
    try {
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY!, provider);
      
      // Test basic connection
      const network = await provider.getNetwork();
      console.log(`✅ Connected to Ethereum - Chain ID: ${network.chainId}`);
      
      // Test wallet
      const balance = await provider.getBalance(wallet.address);
      console.log(`✅ Wallet: ${wallet.address}`);
      console.log(`✅ Balance: ${ethers.formatEther(balance)} ETH`);
      
      // Test 1inch LOP contract exists
      const lopAddress = process.env.ETHEREUM_LOP!;
      const lopCode = await provider.getCode(lopAddress);
      if (lopCode !== '0x') {
        console.log(`✅ 1inch Limit Order Protocol found at: ${lopAddress}`);
      } else {
        console.log(`❌ 1inch LOP not found at: ${lopAddress}`);
      }
      
      // Test USDC contract
      const usdcAddress = process.env.ETHEREUM_USDC!;
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        provider
      );
      
      const symbol = await usdcContract.symbol();
      const decimals = await usdcContract.decimals();
      console.log(`✅ Found token: ${symbol} with ${decimals} decimals`);
      
      return true;
    } catch (error) {
      console.error('❌ Ethereum connection failed:', error);
      return false;
    }
  }

  async testNEAR() {
    console.log('\n🔍 Testing NEAR connection...');
    
    try {
      // Use the new NEAR JS provider
      const provider = new JsonRpcProvider({
        url: process.env.NEAR_RPC_URL!
      });
      
      // Test basic connection
      const status = await provider.status();
      console.log(`✅ Connected to NEAR ${process.env.NEAR_NETWORK}`);
      console.log(`✅ Latest block: ${status.sync_info.latest_block_height}`);
      console.log(`✅ Chain ID: ${status.chain_id}`);
      
      // Test your deployed fusion contract
      try {
        const fusionContract = process.env.NEAR_FUSION_CONTRACT!;
        const contractState = await provider.query({
          request_type: 'view_account',
          finality: 'final',
          account_id: fusionContract
        });
        console.log(`✅ Your Fusion contract found: ${fusionContract}`);
        console.log(`✅ Contract balance: ${parseInt((contractState as any).amount) / 1e24} NEAR`);
      } catch (error) {
        console.log(`❌ Could not find your fusion contract: ${process.env.NEAR_FUSION_CONTRACT}`);
      }
      
      // Test wrap.testnet contract
      try {
        const wrapContract = await provider.query({
          request_type: 'view_account',
          finality: 'final',
          account_id: 'wrap.testnet'
        });
        console.log(`✅ wNEAR contract found: wrap.testnet`);
      } catch (error) {
        console.log(`❌ Could not find wrap.testnet contract`);
      }
      
      // Test your account
      try {
        const yourAccount = await provider.query({
          request_type: 'view_account',
          finality: 'final',
          account_id: process.env.NEAR_ACCOUNT_ID!
        });
        const balance = parseInt((yourAccount as any).amount) / 1e24;
        console.log(`✅ Your account: ${process.env.NEAR_ACCOUNT_ID}`);
        console.log(`✅ Account balance: ${balance} NEAR`);
      } catch (error) {
        console.log(`❌ Could not find your account: ${process.env.NEAR_ACCOUNT_ID}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ NEAR connection failed:', error);
      return false;
    }
  }

  async testYourContracts() {
    console.log('\n🔍 Testing your deployed contracts...');
    
    try {
      const provider = new JsonRpcProvider({
        url: process.env.NEAR_RPC_URL!
      });
      
      // Test if you're a resolver
      const isResolverResult = await provider.query({
        request_type: 'call_function',
        finality: 'final',
        account_id: process.env.NEAR_FUSION_CONTRACT!,
        method_name: 'is_resolver',
        args_base64: Buffer.from(JSON.stringify({
          resolver_id: process.env.NEAR_ACCOUNT_ID!
        })).toString('base64')
      });
      
      const isResolver = JSON.parse(Buffer.from((isResolverResult as any).result).toString());
      console.log(`✅ Are you a resolver? ${isResolver ? 'YES' : 'NO'}`);
      
      if (!isResolver) {
        console.log(`⚠️  You need to add yourself as a resolver first!`);
        console.log(`Run: near call ${process.env.NEAR_FUSION_CONTRACT} add_resolver '{"resolver_id": "${process.env.NEAR_ACCOUNT_ID}"}' --use-account ${process.env.NEAR_ACCOUNT_ID}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Contract test failed:', error);
      return false;
    }
  }

  async runAll() {
    console.log('🚀 Starting connectivity tests...\n');
    
    const ethResult = await this.testEthereum();
    const nearResult = await this.testNEAR();
    const contractResult = await this.testYourContracts();
    
    console.log('\n📊 Test Results:');
    console.log(`Ethereum: ${ethResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`NEAR: ${nearResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Your Contracts: ${contractResult ? '✅ PASS' : '❌ FAIL'}`);
    
    if (ethResult && nearResult && contractResult) {
      console.log('\n🎉 All connectivity tests passed! Ready to build the relayer.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check your configuration.');
    }
  }
}

// Run the test
const test = new ConnectivityTest();
test.runAll();