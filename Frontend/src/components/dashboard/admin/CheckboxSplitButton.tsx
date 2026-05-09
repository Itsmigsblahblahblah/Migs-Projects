import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CheckboxSplitButtonProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    selectReportsByStatus: (status: 'all' | 'processed' | 'resolved') => void;
}

const CheckboxSplitButton = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    selectReportsByStatus,
}: CheckboxSplitButtonProps) => {
    const checkboxRef = useRef<HTMLInputElement>(null);
    const [isUpdating, setIsUpdating] = useState(false); // Track update state

    // Compute checkbox state
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;
    const isPartiallySelected = totalCount > 0 && selectedCount > 0 && selectedCount < totalCount;
    const isEmpty = totalCount === 0 || selectedCount === 0;

    // Update checkbox visual state when selection changes
    useEffect(() => {
        if (checkboxRef.current) {
            // Set indeterminate state via DOM (React doesn't support this prop)
            checkboxRef.current.indeterminate = isPartiallySelected;
            
            // Force checkbox to re-render by triggering a reflow if needed
            setIsUpdating(false);
        }
    }, [selectedCount, totalCount, isPartiallySelected]);

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevent multiple clicks during update
        if (isUpdating) return;
        
        // Determine current state and take appropriate action
        if (isAllSelected) {
            // All selected -> Deselect all
            setIsUpdating(true);
            onDeselectAll();
            // Reset updating state after a brief delay
            setTimeout(() => setIsUpdating(false), 50);
        } else if (isPartiallySelected) {
            // Partially selected -> Deselect all directly
            setIsUpdating(true);
            onDeselectAll();
            // Reset updating state after a brief delay
            setTimeout(() => setIsUpdating(false), 50);
        } else {
            // None selected -> Select all
            setIsUpdating(true);
            onSelectAll();
            // Reset updating state after a brief delay
            setTimeout(() => setIsUpdating(false), 50);
        }
    };

    return (
        <>
            <div className="flex items-center justify-center">
                <div className="inline-flex items-center border rounded-md hover:bg-blue-50/70 transition-colors duration-150 group cursor-pointer" style={{ padding: '2px' }}>
                    {/* Checkbox Portion - Left Side */}
                    <input
                        ref={checkboxRef}
                        type="checkbox"
                        checked={isAllSelected}
                        onClick={handleCheckboxClick}
                        onChange={() => {}} // Controlled component - no direct changes
                        className="w-4 h-4 cursor-pointer m-1"
                        style={{ flexShrink: 0 }}
                        disabled={isUpdating || totalCount === 0} // Disable during updates
                    />
                    
                    {/* Vertical Divider */}
                    <div className="w-px h-4 bg-border mx-1" />
                    
                    {/* Dropdown Arrow Portion - Right Side */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                className="inline-flex items-center justify-center h-5 w-5 cursor-pointer hover:bg-blue-100/50 rounded-r-md transition-colors duration-150 focus:outline-none" 
                                title="Filter selection"
                                style={{ flexShrink: 0 }}
                            >
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-white shadow-md">
                            <DropdownMenuItem 
                                onClick={() => selectReportsByStatus('all')}
                                className="cursor-pointer hover:bg-blue-50"
                            >
                                All
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => selectReportsByStatus('processed')}
                                className="cursor-pointer hover:bg-blue-50"
                            >
                                Processed
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => selectReportsByStatus('resolved')}
                                className="cursor-pointer hover:bg-blue-50"
                            >
                                Resolved
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </>
    );
};

export default CheckboxSplitButton;
