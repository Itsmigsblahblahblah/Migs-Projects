import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

interface InfoTooltipProps {
    content: string;
    className?: string;
}

const InfoTooltip = ({ content, className = "" }: InfoTooltipProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <HelpCircle 
                    className={`h-4 w-4 text-muted-foreground cursor-pointer ${className}`} 
                    onClick={handleClick}
                />
            </PopoverTrigger>
            <PopoverContent className="max-w-xs p-3">
                <p className="whitespace-pre-line text-sm">{content}</p>
            </PopoverContent>
        </Popover>
    );
};

export default InfoTooltip;