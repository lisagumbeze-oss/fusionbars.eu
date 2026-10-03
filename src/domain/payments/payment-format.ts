const IBAN_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24,
  FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21,
  LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24,
  SE: 24, SI: 19, SK: 24, SM: 27,
};

export type FormatState = 'FORMAT_VALID' | 'FORMAT_INVALID' | 'NOT_CONFIGURED';

export function ibanFormat(value: string | undefined): FormatState {
  const compact = (value || '').replace(/\s+/g, '').toUpperCase();
  if (!compact) return 'NOT_CONFIGURED';
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(compact)) return 'FORMAT_INVALID';
  const expected = IBAN_LENGTHS[compact.slice(0, 2)];
  if (!expected || compact.length !== expected) return 'FORMAT_INVALID';
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const chunk = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of chunk) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1 ? 'FORMAT_VALID' : 'FORMAT_INVALID';
}

export function bicFormat(value: string | undefined): FormatState {
  const compact = (value || '').replace(/\s+/g, '').toUpperCase();
  if (!compact) return 'NOT_CONFIGURED';
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(compact) ? 'FORMAT_VALID' : 'FORMAT_INVALID';
}

export function receivingAddressFormat(asset: string, network: string | undefined, address: string | undefined): FormatState {
  const value = (address || '').trim();
  if (!value || !network?.trim()) return 'NOT_CONFIGURED';
  if (asset === 'BTC') {
    if (/^(bc1)[a-z0-9]{25,62}$/i.test(value) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(value)) return 'FORMAT_VALID';
    return 'FORMAT_INVALID';
  }
  if (asset === 'ETH' || /erc-?20|ethereum/i.test(network)) {
    if (/^0x[a-fA-F0-9]{40}$/.test(value) && !/^0x0{40}$/i.test(value)) return 'FORMAT_VALID';
    return 'FORMAT_INVALID';
  }
  if (/trc-?20|tron/i.test(network)) {
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value) ? 'FORMAT_VALID' : 'FORMAT_INVALID';
  }
  return 'NOT_CONFIGURED';
}
