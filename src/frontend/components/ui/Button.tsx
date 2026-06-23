import React from 'react';
import { cn } from '@lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'premium';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-title-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-primary text-on-primary hover:brightness-110 shadow-sm": variant === 'primary',
            "glass-card text-on-surface hover:bg-white/10": variant === 'secondary',
            "hover:bg-white/5 text-on-surface-variant hover:text-white": variant === 'ghost',
            "bg-red-600 text-white hover:bg-red-500 shadow-sm": variant === 'danger',
            "premium-button text-white hover:brightness-110 shadow-lg active:scale-95": variant === 'premium',
            "h-10 w-10 p-0": size === 'icon',
            "h-9 px-4 text-sm": size === 'sm',
            "h-10 px-4 py-2 text-sm": size === 'md',
            "h-12 px-8 text-base": size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
