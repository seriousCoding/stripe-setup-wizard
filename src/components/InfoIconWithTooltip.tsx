
import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; // TooltipProvider removed
import { Info } from 'lucide-react';
import { cn } from "@/lib/utils"; // cn import moved here

interface InfoIconWithTooltipProps {
  description: string;
  className?: string;
  iconSize?: number;
}

export const InfoIconWithTooltip: React.FC<InfoIconWithTooltipProps> = ({ description, className, iconSize = 16 }) => {
  return (
    // TooltipProvider removed from here
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Removed 'cursor-help' from className */}
        <span className={cn("ml-1", className)}> {/* Reduced ml-2 to ml-1 for slightly tighter spacing */}
          <Info size={iconSize} className="text-gray-400 hover:text-gray-600" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm p-2 bg-gray-800 text-white rounded-md shadow-lg" align="start">
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
    // TooltipProvider removed from here
  );
};

// Redundant cn import removed from here

