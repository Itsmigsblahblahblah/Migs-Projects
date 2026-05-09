import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CheckboxSplitButtonProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    selectReportsByStatus: (status: 'all' | 'processed' | 'resolved') => void;
    onConfirmClear?: () => void; // Optional confirmation callback
}

const CheckboxSplitButton = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    selectReportsByStatus,
    onConfirmClear,
}: CheckboxSplitButtonProps) => {
    const checkboxRef = useRef<HTMLInputElement>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Update checkbox state based on selection
    useEffect(() => {
        // Update the actual checkbox element
        if (checkboxRef.current) {
            const isAllSelected = selectedCount === totalCount && totalCount > 0;
            const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
            
            checkboxRef.current.checked = isAllSelected;
            checkboxRef.current.indeterminate = isPartiallySelected;
        }
    }, [selectedCount, totalCount]);

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        const isAllSelected = selectedCount === totalCount && totalCount > 0;
        const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;
        
        // If all selected -> deselect all
        // If partially selected (minus sign) -> show confirmation dialog
        // If none selected -> select all
        if (isAllSelected) {
            onDeselectAll();
        } else if (isPartiallySelected) {
            // Show confirmation dialog for indeterminate state
            setShowConfirmDialog(true);
        } else {
            onSelectAll();
        }
    };

    const handleConfirmClear = () => {
        onDeselectAll();
        setShowConfirmDialog(false);
    };

    return (
        <>
            <div className="flex items-center justify-center">
                <div className="inline-flex items-center border rounded-md hover:bg-blue-50/70 transition-colors duration-150 group cursor-pointer" style={{ padding: '2px' }}>
                    {/* Checkbox Portion - Left Side */}
                    <input
                        ref={checkboxRef}
                        type="checkbox"
                        checked={selectedCount === totalCount && totalCount > 0}
                        onClick={handleCheckboxClick}
                        onChange={() => {}}
                        className="w-4 h-4 cursor-pointer m-1"
                        style={{ flexShrink: 0 }}
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

            {/* Confirmation Dialog for Indeterminate State */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Selection?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deselect all currently selected reports across all pages.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmClear}>
                            Clear Selection
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default CheckboxSplitButton;
