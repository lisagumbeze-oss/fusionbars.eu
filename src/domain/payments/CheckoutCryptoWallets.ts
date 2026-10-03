import QRCode from 'qrcode';
import { CurrencyCode } from '@/types';
import { cryptoAmountToBaseUnits, quoteCryptoAmounts } from '@/domain/payments/CryptoAmountQuote';
import { isPlaceholderCustomerPaymentDetail } from '@/domain/payments/payment-format';

export interface CheckoutCryptoWallet {
  symbol: string;
  name: string;
  network: string;
  address: string;
  /** Exact amount to send, locked from the order total. Example: 0.00155700 */
  amount?: string;
  qrDataUrl?: string;
}

/**
 * Customer wallets come from operator environment configuration.
 * No wallet address is compiled into the application.
 */
const WALLET_ENV: Array<{ symbol: string; name: string; networkEnv: string; addressEnv: string }> = [
  { symbol: 'BTC', name: 'Bitcoin', networkEnv: 'CRYPTO_BTC_NETWORK', addressEnv: 'CRYPTO_BTC_ADDRESS' },
  { symbol: 'ETH', name: 'Ethereum', networkEnv: 'CRYPTO_ETH_NETWORK', addressEnv: 'CRYPTO_ETH_ADDRESS' },
  { symbol: 'USDT', name: 'Tether', networkEnv: 'CRYPTO_USDT_NETWORK', addressEnv: 'CRYPTO_USDT_ADDRESS' },
  { symbol: 'BCH', name: 'Bitcoin Cash', networkEnv: 'CRYPTO_BCH_NETWORK', addressEnv: 'CRYPTO_BCH_ADDRESS' },
];

let testWallets: CheckoutCryptoWallet[] | null = null;

export function setCheckoutCryptoWalletsForTests(wallets: CheckoutCryptoWallet[] | null): void {
  testWallets = wallets;
}

function walletsFromEnvironment(): CheckoutCryptoWallet[] {
  return WALLET_ENV.flatMap((row) => {
    const network = process.env[row.networkEnv]?.trim() || '';
    const address = process.env[row.addressEnv]?.trim() || '';
    if (isPlaceholderCustomerPaymentDetail(network) || isPlaceholderCustomerPaymentDetail(address)) return [];
    return [{ symbol: row.symbol, name: row.name, network, address }];
  });
}

function paymentUri(wallet: CheckoutCryptoWallet): string {
  if (wallet.symbol === 'BTC') {
    return wallet.amount
      ? `bitcoin:${wallet.address}?amount=${wallet.amount}`
      : `bitcoin:${wallet.address}`;
  }
  if (wallet.symbol === 'ETH') {
    return wallet.amount
      ? `ethereum:${wallet.address}?value=${cryptoAmountToBaseUnits(wallet.amount, 18)}`
      : `ethereum:${wallet.address}`;
  }
  if (wallet.symbol === 'BCH') {
    return wallet.amount
      ? `bitcoincash:${wallet.address}?amount=${wallet.amount}`
      : `bitcoincash:${wallet.address}`;
  }
  return wallet.address;
}

export async function getCheckoutCryptoWallets(quote: {
  amountMinor: number;
  currency: CurrencyCode;
}): Promise<CheckoutCryptoWallet[]> {
  const source = testWallets ?? walletsFromEnvironment();
  const wallets = source.filter(
    (wallet) => wallet.symbol.trim() && wallet.name.trim() && wallet.network.trim() && wallet.address.trim()
  ).map((wallet) => ({
    symbol: wallet.symbol.trim(),
    name: wallet.name.trim(),
    network: wallet.network.trim(),
    address: wallet.address.trim(),
  }));

  const amounts = wallets.length > 0
    ? await quoteCryptoAmounts(quote.amountMinor, quote.currency, wallets.map((wallet) => wallet.symbol))
    : {};

  return Promise.all(
    wallets.map(async (wallet) => {
      const quoted = { ...wallet, amount: amounts[wallet.symbol] };
      return {
        ...quoted,
        qrDataUrl: await QRCode.toDataURL(paymentUri(quoted), {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 280,
          color: { dark: '#121212', light: '#FFFFFF' },
        }),
      };
    })
  );
}
