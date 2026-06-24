/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/** Single source of truth for the CompassIQ brand mark (static asset in /public). */
export const LOGO_SRC = '/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
  /** Size by CSS width classes in className instead of fixed height. */
  byWidth?: boolean;
  variant?: 'default' | 'header';
}

/** Moderate header logo sizing — width-led, no max-height cap that shrinks wide wordmarks. */
export const HEADER_LOGO_CLASS =
  'w-[min(120px,34vw)] sm:w-[135px] md:w-[100px] h-auto object-contain object-left';

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 48,
  byWidth = false,
  variant='default',
}) => {
  const variantClass = variant === 'header' ? HEADER_LOGO_CLASS : '';
  const mergedClassName = [variantClass, className].filter(Boolean).join(' ');

  return (
    <img
      src={LOGO_SRC}
      alt="CompassIQ"
      className={`object-contain object-left h-auto shrink-0 ${mergedClassName}`}
      style={
        byWidth || variant === 'header'
          ? undefined
          : { height: size, width: 'auto', maxWidth: size * 6.5, minHeight: size * 0.85 }
      }
      id="compassiq-brand-logo"
      draggable={false}
    />
  );
};

export default Logo;
