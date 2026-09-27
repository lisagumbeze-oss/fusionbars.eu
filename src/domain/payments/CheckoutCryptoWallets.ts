import QRCode from 'qrcode';
import { CurrencyCode } from '@/types';
import { cryptoAmountToBaseUnits, quoteCryptoAmounts } from '@/domain/payments/CryptoAmountQuote';

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
 * Wallets shown under the order-success message when the customer pays
 * with cryptocurrency. Add one entry at a time.
 */
export const CHECKOUT_CRYPTO_WALLETS: CheckoutCryptoWallet[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin',
    address: 'bc1qzsn5djk2pklr49hepvpu4ckzwj9tujkxtdlqma',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum',
    address: '0x5fad5A80927C763C4037A7c07051910747E8179d',
  },
  {
    symbol: 'BCH',
    name: 'Bitcoin Cash',
    network: 'Bitcoin Cash',
    address: 'qptpfw320hvdrk0xutpg2kdhauruwle65uxzz7p57v',
  },
];

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
  const wallets = CHECKOUT_CRYPTO_WALLETS.filter(
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
