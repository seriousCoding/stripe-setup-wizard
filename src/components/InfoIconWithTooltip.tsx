
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface InfoIconWithTooltipProps {
  description: string;
  className?: string;
  iconSize?: number;
}

export const InfoIconWithTooltip: React.FC<InfoIconWithTooltipProps> = ({ description, className, iconSize = 16 }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("ml-2 cursor-help", className)}>
            <Info size={iconSize} className="text-gray-400 hover:text-gray-600" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-sm p-2 bg-gray-800 text-white rounded-md shadow-lg" align="start">
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Helper function cn from utils, if not already available in global scope for this component
// For simplicity, assuming cn is available or can be added if needed.
// If cn is not globally available, it should be imported from "@/lib/utils"
import { cn } from "@/lib/utils";

