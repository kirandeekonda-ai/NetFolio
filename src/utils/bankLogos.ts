/**
 * Utility functions for bank logos and branding
 */

// Bank code mapping - maps common bank names to their codes
const BANK_NAME_TO_CODE: Record<string, string> = {
  // Major Private Banks
  'hdfc bank': 'hdfc',
  'hdfc': 'hdfc',
  'icici bank': 'icic',
  'icici': 'icic',
  'axis bank': 'utib',
  'axis': 'utib',
  'kotak mahindra bank': 'kkbk',
  'kotak': 'kkbk',
  'yes bank': 'yesb',
  'yes': 'yesb',
  'indusind bank': 'indb',
  'indusind': 'indb',
  
  // Major Public Sector Banks
  'state bank of india': 'sbin',
  'sbi': 'sbin',
  'punjab national bank': 'punb',
  'pnb': 'punb',
  'bank of baroda': 'barb',
  'bob': 'barb',
  'canara bank': 'cnrb',
  'canara': 'cnrb',
  'union bank of india': 'ubin',
  'union bank': 'ubin',
  'bank of india': 'bkid',
  'boi': 'bkid',
  'central bank of india': 'cbin',
  'central bank': 'cbin',
  'indian bank': 'idib',
  'indian overseas bank': 'ioba',
  'iob': 'ioba',
  'punjab & sind bank': 'psib',
  'punjab and sind bank': 'psib',
  'uco bank': 'ucba',
  'uco': 'ucba',
  'bank of maharashtra': 'mahb',
  
  // Other Banks
  'bandhan bank': 'bdbl',
  'au small finance bank': 'aubl',
  'au bank': 'aubl',
  'rbl bank': 'ratn',
  'rbl': 'ratn',
  'idfc first bank': 'idfb',
  'idfc': 'idfb',
  'idbi bank': 'ibkl',
  'idbi': 'ibkl',
  'south indian bank': 'sibl',
  'karnataka bank': 'karb',
  'federal bank': 'fdrl',
  'city union bank': 'ciub',
  'jammu & kashmir bank': 'jaka',
  'j&k bank': 'jaka',
  'karur vysya bank': 'kvbl',
  'kvb': 'kvbl',
  'dhanalakshmi bank': 'dlxb',
  'tamilnad mercantile bank': 'tmbl',
  'the nainital bank': 'ntbl',
  'nainital bank': 'ntbl',
  'csb bank': 'csbk',
  'dcb bank': 'dcbl',
  
  // Foreign Banks
  'dbs bank india': 'dbsi',
  'dbs bank': 'dbsi',
  'dbs': 'dbsi'
};

/**
 * Get the bank code from bank name
 */
export function getBankCode(bankName: string): string | null {
  if (!bankName) return null;
  
  const normalizedName = bankName.toLowerCase().trim();
  return BANK_NAME_TO_CODE[normalizedName] || null;
}

/**
 * Get the local logo path for a bank
 */
export function getBankLogoPath(bankName: string): string | null {
  const bankCode = getBankCode(bankName);
  return bankCode ? `/bank-logos/${bankCode}.png` : null;
}

/**
 * Get bank emoji fallback based on account type
 */
export function getBankEmoji(accountType: string): string {
  switch (accountType?.toLowerCase()) {
    case 'checking':
      return '💳';
    case 'savings':
      return '💰';
    case 'credit':
      return '💳';
    case 'investment':
      return '📈';
    default:
      return '🏦';
  }
}

/**
 * Get bank-specific emoji or fallback for dropdowns
 */
export function getBankSpecificEmoji(bankName: string): string {
  const normalizedName = bankName.toLowerCase().trim();
  
  // Bank-specific emojis
  if (normalizedName.includes('hdfc')) return '🏦';
  if (normalizedName.includes('icici')) return '💼';
  if (normalizedName.includes('axis')) return '🔷';
  if (normalizedName.includes('kotak')) return '💎';
  if (normalizedName.includes('yes')) return '✅';
  if (normalizedName.includes('indusind')) return '🎯';
  if (normalizedName.includes('sbi') || normalizedName.includes('state bank')) return '🏛️';
  if (normalizedName.includes('pnb') || normalizedName.includes('punjab national')) return '🇮🇳';
  if (normalizedName.includes('bank of baroda')) return '🏦';
  if (normalizedName.includes('canara')) return '🟡';
  if (normalizedName.includes('union bank')) return '🤝';
  
  // Default bank emoji
  return '🏦';
}

/**
 * Bank Logo Component Props
 */
export interface BankLogoProps {
  bankName: string;
  accountType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Get size classes for bank logo
 */
export function getBankLogoSizeClasses(size: 'sm' | 'md' | 'lg' = 'md') {
  switch (size) {
    case 'sm':
      return 'w-8 h-8 text-xl';
    case 'lg':
      return 'w-20 h-20 text-4xl';
    case 'md':
    default:
      return 'w-16 h-16 text-2xl';
  }
}
