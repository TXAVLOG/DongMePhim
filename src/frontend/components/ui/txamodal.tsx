import React, { useEffect } from 'react';
import { cn } from '@lib/utils';
import { X } from 'lucide-react';

export interface TxaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function txamodal({ isOpen, onClose, title, children, className }: TxaModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="txamodal" onClick={onClose}>
      <div
        className={cn("txamodal-content", className)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-outfit font-semibold text-white">{title}</h2>}
          <button
            onClick={onClose}
            className={cn("rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors", !title && "absolute top-4 right-4")}
          >
            <X size={20} />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Keep capitalized alias for React component standard imports
export { txamodal as TxaModal };
export { txamodal as Modal };
