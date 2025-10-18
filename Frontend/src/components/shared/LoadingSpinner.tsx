import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-8 h-8",
        lg: "w-12 h-12"
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={cn(
                    "border-4 border-primary border-t-transparent rounded-full animate-spin",
                    sizeClasses[size],
                    className
                )}
            />
        </div>
    );
};

export default LoadingSpinner;