/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLanguage,
  onLanguageChange
}) => {
  // Sync text direction of HTML element with current language choice
  useEffect(() => {
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [currentLanguage]);

  return (
    <div className="flex items-center space-x-2 rtl:space-x-reverse no-print" id="lang-switcher-container">
      <button
        id="lang-btn-fr"
        onClick={() => onLanguageChange('fr')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all duration-200 cursor-pointer ${
          currentLanguage === 'fr'
            ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
            : 'bg-white text-brand-blue border-brand-marble hover:bg-brand-ivory/50'
        }`}
      >
        Français (FR)
      </button>
      <button
        id="lang-btn-ar"
        onClick={() => onLanguageChange('ar')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all duration-200 cursor-pointer font-sans ${
          currentLanguage === 'ar'
            ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
            : 'bg-white text-brand-blue border-brand-marble hover:bg-brand-ivory/50'
        }`}
      >
        العربية (AR)
      </button>
    </div>
  );
};
export default LanguageSwitcher;
