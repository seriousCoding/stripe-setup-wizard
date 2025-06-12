
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  onRemove: (id: string) => void;
}

const CustomToast: React.FC<CustomToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 3000,
  onRemove,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-remove after duration
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(id);
    }, 300);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600 border-red-700 text-white';
      case 'success':
        return 'bg-green-600 border-green-700 text-white';
      default:
        return 'bg-blue-600 border-blue-700 text-white';
    }
  };

  const getRippleColor = () => {
    switch (variant) {
      case 'destructive':
        return 'before:bg-red-400';
      case 'success':
        return 'before:bg-green-400';
      default:
        return 'before:bg-blue-400';
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 left-4 right-4 z-[9999] transform transition-all duration-300 ease-out',
        'h-16 rounded-lg shadow-2xl border-2 backdrop-blur-sm',
        'flex items-center px-4 space-x-3',
        'relative overflow-hidden',
        // Ripple effect
        'before:absolute before:top-0 before:left-0 before:w-full before:h-full',
        'before:bg-gradient-to-r before:opacity-20 before:animate-pulse',
        getRippleColor(),
        getVariantStyles(),
        isVisible && !isRemoving ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-full opacity-0 scale-95',
        isRemoving && 'animate-pulse'
      )}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{title}</div>
        {description && (
          <div className="text-xs opacity-90 truncate">{description}</div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors duration-200 hover:scale-110 transform"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
        <div 
          className="h-full bg-white/70 animate-[shrink_3s_linear_forwards]"
          style={{
            animationDuration: `${duration}ms`,
          }}
        />
      </div>
    </div>
  );
};

export default CustomToast;
