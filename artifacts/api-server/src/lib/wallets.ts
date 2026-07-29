/**
 * Crypto wallet addresses for payment collection.
 * Set via environment variables in production.
 */
export function getWalletAddresses(): Record<string, string> {
  return {
    BTC: process.env.WALLET_BTC || "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf1d",
    ETH: process.env.WALLET_ETH || "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1",
    USDT_TRC20: process.env.WALLET_USDT_TRC20 || "TKFLszWprxEjE5KGYne2rhu9zQmFp6YAVQ",
    USDT_ERC20: process.env.WALLET_USDT_ERC20 || "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1",
    USDC: process.env.WALLET_USDC || "0x742d35Cc6634C0532925a3b8D4C9E6B9d5b8f2E1",
    LTC: process.env.WALLET_LTC || "LZ2sVFXBt1zP4UL8PGzQa9UPvK1YBDJ3Hb",
  };
}
