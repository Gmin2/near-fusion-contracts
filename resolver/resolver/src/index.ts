import { FusionRelayerBot } from './relayer/bot';

async function main() {
  const bot = new FusionRelayerBot();
  
  try {
    await bot.initialize();
    await bot.start();
    
    // Enhanced status check every 30 seconds
    setInterval(async () => {
      const status = await bot.getStatus();
      
      if (status.activeOrders > 0) {
        console.log(`\n📊 Status Report:`);
        console.log(`   🔄 Active: ${status.activeOrders}/${status.totalOrders} orders`);
        console.log(`   📦 Detected: ${status.breakdown.detected}`);
        console.log(`   🔒 Escrow Created: ${status.breakdown.escrowCreated}`);
        console.log(`   🔓 Claimed: ${status.breakdown.claimed}`);
        console.log(`   ✅ Completed: ${status.breakdown.completed}`);
        
        // Show recent active orders
        if (status.recentOrders.detected.length > 0) {
          console.log(`   📋 Recent detections: ${status.recentOrders.detected.map(o => `${o.hash}(${o.age})`).join(', ')}`);
        }
      } else {
        console.log(`📊 Status: ${status.totalOrders} total orders, ${status.activeOrders} active`);
      }
    }, 30000);
    
    // Add some test commands for development
    console.log('\n🛠️  Development commands:');
    console.log('   - Press "t" + Enter to create a test order');
    console.log('   - Press "c" + Enter to simulate a claim on the latest order');
    
    // Handle keyboard input for testing
    process.stdin.setRawMode;
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      const input = key.toString().trim().toLowerCase();
      
      if (input === 't') {
        console.log('\n🧪 Creating test order...');
        const orderHash = await bot.createTestOrder();
        console.log(`✅ Test order created: ${orderHash.slice(0, 10)}...`);
      } else if (input === 'c') {
        const status = await bot.getStatus();
        const activeOrders = [...status.recentOrders.detected, ...status.recentOrders.escrowCreated];
        if (activeOrders.length > 0) {
          const latestOrder = activeOrders[0];
          const fullHash = '0x' + latestOrder.hash.replace('...', '').padEnd(64, '0');
          console.log(`\n🧪 Simulating claim for: ${latestOrder.hash}`);
          await bot.simulateClaim(fullHash);
        } else {
          console.log('\n❌ No active orders to claim');
        }
      }
    });
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down relayer bot...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('💥 Failed to start relayer bot:', error);
    process.exit(1);
  }
}

main();