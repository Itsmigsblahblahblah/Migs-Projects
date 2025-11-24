import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import InfoTooltip from "@/components/ui/info-tooltip";
import { getStepByStepInstructions } from "@/services/geminiService";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  completedAt?: string;
  detailedInstructions?: string[]; // Add detailed instructions property
}

interface AccordionChecklistItemProps {
  item: ChecklistItem;
  onToggleItem: (itemId: string) => void;
  handleToggleWithConfirmation: (itemId: string, currentlyCompleted: boolean) => void;
  onUpdateInstructions?: (itemId: string, instructions: string[]) => void; // Make optional
  cropName?: string; // Make optional
}

const AccordionChecklistItem = ({
  item,
  onToggleItem,
  handleToggleWithConfirmation,
  onUpdateInstructions = () => {}, // Default noop function
  cropName = "" // Default empty string
}: AccordionChecklistItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [instructions, setInstructions] = useState<string[]>(item.detailedInstructions || []);
  const [isLoading, setIsLoading] = useState(false);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // Fetch step-by-step instructions when the accordion opens
  const fetchInstructions = async () => {
    // If we already have instructions stored, use them
    if (item.detailedInstructions && item.detailedInstructions.length > 0) {
      setInstructions(item.detailedInstructions);
      return;
    }

    // Only fetch if we don't have instructions and aren't already loading
    if (!isOpen && instructions.length === 0 && !isLoading) {
      setIsLoading(true);
      try {
        const steps = await getStepByStepInstructions(`${cropName}: ${item.title}`);
        setInstructions(steps);
        // Notify parent component to update the stored instructions
        onUpdateInstructions(item.id, steps);
      } catch (error) {
        console.error("Error fetching instructions:", error);
        setInstructions(["Detailed instructions are not available at the moment."]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleAccordion = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      fetchInstructions();
    }
  };

  // When the item changes, update local instructions
  useEffect(() => {
    if (item.detailedInstructions && item.detailedInstructions.length > 0) {
      setInstructions(item.detailedInstructions);
    }
  }, [item.detailedInstructions]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg hover:bg-muted/50 transition-colors">
        {/* Main accordion header */}
        <div 
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={(e) => {
            // Prevent toggle when clicking on checkbox or info tooltip
            if (!(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)) {
              toggleAccordion();
            }
          }}
        >
          <Checkbox
            id={item.id}
            checked={item.completed}
            onCheckedChange={() => handleToggleWithConfirmation(item.id, item.completed)}
          />
          
          <div className="flex-1 min-w-0">
            <label
              htmlFor={item.id}
              className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
            >
              {item.title}
            </label>
            <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
            {item.completed && item.completedAt && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Completed: {formatTimestamp(item.completedAt)}
                </span>
              </div>
            )}
          </div>
          
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleAccordion();
              }}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
          
          <InfoTooltip content="Mark this task as completed when finished. Click the arrow to see detailed instructions." />
        </div>
        
        {/* Collapsible content */}
        <CollapsibleContent className="px-3 pb-3">
          <div className="pl-8 pr-2 pt-2 border-l-2 border-muted ml-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Loading detailed instructions...
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <h4 className="text-sm font-medium mb-2">Step-by-Step Instructions:</h4>
                  <ul className="space-y-2">
                    {instructions.slice(0, showFullDetails ? instructions.length : 3).map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium mt-0.5">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {instructions.length > 3 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto mt-2 text-primary"
                      onClick={() => setShowFullDetails(!showFullDetails)}
                    >
                      {showFullDetails ? "Show Less" : "See More"}
                    </Button>
                  )}
                  
                  {instructions.length === 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground italic">
                      No detailed instructions available for this task.
                    </p>
                  )}
                </div>
                
                {!item.completed && (
                  <Button 
                    size="sm" 
                    onClick={() => handleToggleWithConfirmation(item.id, item.completed)}
                    className="mt-2"
                  >
                    Mark as Completed
                  </Button>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default AccordionChecklistItem;