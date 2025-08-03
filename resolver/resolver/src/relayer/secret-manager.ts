import { keccak256 } from 'ethers';
import { randomBytes } from 'crypto';

export interface SecretInfo {
  secret: string;
  secretHash: string;
  hashlock: string;
}

export interface OrderInfo {
  orderHash: string;
  secretInfo: SecretInfo;
  status: 'detected' | 'escrow_created' | 'claimed' | 'completed' | 'cancelled';
  createdAt: Date;
  maker: string;
  taker: string;
  srcChain: string;
  dstChain: string;
  srcToken: string;
  dstToken: string;
  srcAmount: string;
  dstAmount: string;
  timelockSrc?: number;
  timelockDst?: number;
}

export class SecretManager {
  // In-memory storage
  private orders = new Map<string, OrderInfo>();
  private ordersByStatus = new Map<string, Set<string>>();

  /**
   * Generate a cryptographically secure secret
   */
  generateSecret(): string {
    // return randomBytes(32).toString(); // Returns 0x + 64 hex chars
    console.log('generateSecret', randomBytes(32).toString('hex'));
    return '0x' + randomBytes(32).toString('hex');

  }

  /**
   * Hash a secret using keccak256
   */
  hashSecret(secret: string): string {
    if (!secret.startsWith("0x") || secret.length !== 66) {
      throw new Error("Secret must be 32-byte hex string");
    }
    return keccak256(secret);
  }

  /**
   * Generate complete secret info for a new order
   */
  generateSecretInfo(): SecretInfo {
    const secret = this.generateSecret();
    const secretHash = this.hashSecret(secret);

    return {
      secret,
      secretHash,
      hashlock: secretHash,
    };
  }

  /**
   * Store a new order with its secret
   */
  storeOrder(
    orderHash: string,
    orderData: {
      maker: string;
      taker: string;
      srcChain: string;
      dstChain: string;
      srcToken: string;
      dstToken: string;
      srcAmount: string;
      dstAmount: string;
      timelockSrc?: number;
      timelockDst?: number;
    }
  ): SecretInfo {
    const secretInfo = this.generateSecretInfo();

    const orderInfo: OrderInfo = {
      orderHash,
      secretInfo,
      status: "detected",
      createdAt: new Date(),
      ...orderData,
    };

    // Store in memory
    this.orders.set(orderHash, orderInfo);
    this.addToStatusIndex(orderHash, "detected");

    console.log(`🔐 Generated secret for order: ${orderHash.slice(0, 10)}...`);
    console.log(
      `   Secret: ${secretInfo.secret.slice(0, 10)}...${secretInfo.secret.slice(
        -6
      )}`
    );
    console.log(
      `   Hash: ${secretInfo.secretHash.slice(
        0,
        10
      )}...${secretInfo.secretHash.slice(-6)}`
    );

    return secretInfo;
  }

  /**
   * Get secret for an order
   */
  getSecret(orderHash: string): string | null {
    const order = this.orders.get(orderHash);
    return order?.secretInfo.secret || null;
  }

  /**
   * Get secret hash for an order
   */
  getSecretHash(orderHash: string): string | null {
    const order = this.orders.get(orderHash);
    return order?.secretInfo.secretHash || null;
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderHash: string, newStatus: OrderInfo["status"]): void {
    const order = this.orders.get(orderHash);
    if (!order) {
      console.log(`⚠️  Order not found: ${orderHash.slice(0, 10)}...`);
      return;
    }

    // Remove from old status index
    this.removeFromStatusIndex(orderHash, order.status);

    // Update status
    order.status = newStatus;

    // Add to new status index
    this.addToStatusIndex(orderHash, newStatus);

    console.log(
      `📝 Updated order ${orderHash.slice(0, 10)}... status: ${
        order.status
      } → ${newStatus}`
    );
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderInfo["status"]): OrderInfo[] {
    const orderHashes = this.ordersByStatus.get(status) || new Set();
    return Array.from(orderHashes)
      .map((hash) => this.orders.get(hash))
      .filter(Boolean) as OrderInfo[];
  }

  /**
   * Get order info
   */
  getOrder(orderHash: string): OrderInfo | null {
    return this.orders.get(orderHash) || null;
  }

  /**
   * Get all active orders
   */
  getActiveOrders(): OrderInfo[] {
    return [
      ...this.getOrdersByStatus("detected"),
      ...this.getOrdersByStatus("escrow_created"),
      ...this.getOrdersByStatus("claimed"),
    ];
  }

  /**
   * Get detailed summary statistics
   */
  getSummary() {
    const detected = this.getOrdersByStatus("detected");
    const escrowCreated = this.getOrdersByStatus("escrow_created");
    const claimed = this.getOrdersByStatus("claimed");
    const completed = this.getOrdersByStatus("completed");
    const cancelled = this.getOrdersByStatus("cancelled");

    return {
      totalOrders: this.orders.size,
      active: detected.length + escrowCreated.length + claimed.length,
      detected: detected.length,
      escrowCreated: escrowCreated.length,
      claimed: claimed.length,
      completed: completed.length,
      cancelled: cancelled.length,
      orders: {
        detected: detected.map((o) => ({
          hash: o.orderHash.slice(0, 10) + "...",
          age: this.getOrderAge(o),
        })),
        escrowCreated: escrowCreated.map((o) => ({
          hash: o.orderHash.slice(0, 10) + "...",
          age: this.getOrderAge(o),
        })),
        claimed: claimed.map((o) => ({
          hash: o.orderHash.slice(0, 10) + "...",
          age: this.getOrderAge(o),
        })),
      },
    };
  }

  /**
   * Verify a revealed secret matches our stored hash
   */
  verifyRevealedSecret(orderHash: string, revealedSecret: string): boolean {
    const order = this.orders.get(orderHash);
    if (!order) {
      console.log(
        `❌ No order found for verification: ${orderHash.slice(0, 10)}...`
      );
      return false;
    }

    try {
      const expectedHash = order.secretInfo.secretHash;
      const computedHash = this.hashSecret(revealedSecret);
      const isValid = computedHash === expectedHash;

      if (isValid) {
        console.log(
          `✅ Secret verified for order: ${orderHash.slice(0, 10)}...`
        );
      } else {
        console.log(
          `❌ Secret verification failed for order: ${orderHash.slice(
            0,
            10
          )}...`
        );
      }

      return isValid;
    } catch (error) {
      console.error("❌ Error verifying revealed secret:", error);
      return false;
    }
  }

  // Helper methods
  private addToStatusIndex(orderHash: string, status: string): void {
    if (!this.ordersByStatus.has(status)) {
      this.ordersByStatus.set(status, new Set());
    }
    this.ordersByStatus.get(status)!.add(orderHash);
  }

  private removeFromStatusIndex(orderHash: string, status: string): void {
    const statusSet = this.ordersByStatus.get(status);
    if (statusSet) {
      statusSet.delete(orderHash);
    }
  }

  private getOrderAge(order: OrderInfo): string {
    const ageMs = Date.now() - order.createdAt.getTime();
    const ageSeconds = Math.floor(ageMs / 1000);

    if (ageSeconds < 60) return `${ageSeconds}s`;
    if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m`;
    return `${Math.floor(ageSeconds / 3600)}h`;
  }
}