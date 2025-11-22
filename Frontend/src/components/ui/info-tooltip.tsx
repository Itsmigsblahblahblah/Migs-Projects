import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
    content: string;
    className?: string;
}

const InfoTooltip = ({ content, className = "" }: InfoTooltipProps) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className={`h-4 w-4 text-muted-foreground cursor-help ${className}`} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <p>{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default InfoTooltip;