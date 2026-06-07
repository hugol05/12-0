/**
 * BackButton — shared, accessible back/home control (WS2 design foundation).
 *
 * Presentational on purpose: it renders an accessible <button> and calls
 * `onClick`. Navigation is the consumer's job (WS6 wires it to react-router's
 * navigate(-1) / navigate('/')), so this stays usable anywhere and never
 * couples the design system to the router.
 *
 * Props:
 *   - onClick?    handler (no-op if omitted)
 *   - variant?    'back' (← Arrow) | 'home' (⌂ Home). Default 'back'.
 *   - label?      override the visible + accessible label
 *   - showLabel?  render the text label beside the icon (default false → icon only)
 *   - size?       'sm' | 'md' (default 'md'); both keep a ≥44px tap target
 *   - className?  extra classes for positioning
 */
import './BackButton.css';
import { ArrowLeft, Home } from 'lucide-react';

export interface BackButtonProps {
  onClick?: () => void;
  variant?: 'back' | 'home';
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function BackButton({
  onClick,
  variant = 'back',
  label,
  showLabel = false,
  size = 'md',
  className = '',
}: BackButtonProps) {
  const Icon = variant === 'home' ? Home : ArrowLeft;
  const text = label ?? (variant === 'home' ? 'Home' : 'Back');
  const iconSize = size === 'sm' ? 18 : 20;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`back-button back-button--${size} ${showLabel ? 'back-button--labeled' : ''} ${className}`.trim()}
      aria-label={text}
    >
      <Icon size={iconSize} aria-hidden="true" strokeWidth={2.25} />
      {showLabel && <span className="back-button__label">{text}</span>}
    </button>
  );
}
