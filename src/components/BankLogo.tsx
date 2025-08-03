import { FC, useState } from 'react';
import { getBankLogoPath, getBankEmoji, getBankLogoSizeClasses, BankLogoProps } from '@/utils/bankLogos';

export const BankLogo: FC<BankLogoProps> = ({
  bankName,
  accountType,
  size = 'md',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const logoPath = getBankLogoPath(bankName);
  const fallbackEmoji = getBankEmoji(accountType);
  const sizeClasses = getBankLogoSizeClasses(size);

  // If no logo path or image failed to load, show emoji
  if (!logoPath || imageError) {
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center border border-gray-200 ${className}`}>
        <span>{fallbackEmoji}</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} bg-white rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden ${className}`}>
      <img
        src={logoPath}
        alt={`${bankName} logo`}
        className="w-full h-full object-contain p-2"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
};
