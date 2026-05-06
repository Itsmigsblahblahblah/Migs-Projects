import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Upload, Camera } from "lucide-react";
import { uploadProfileImage, validateImage } from "@/services/cloudinaryService";
import { useToast } from "@/hooks/use-toast";
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

interface ProfilePictureSelectorProps {
  selectedImage: string | null;
  onSelectImage: (imagePath: string) => void;
  disabled?: boolean;
  userId?: string;
}

const ProfilePictureSelector = ({ selectedImage, onSelectImage, disabled, userId }: ProfilePictureSelectorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  /**
   * Handle file selection and upload
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      toast({
        title: "Invalid Image",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Show preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const imageUrl = await uploadProfileImage(file);
      
      // Call parent callback to save to Firestore
      onSelectImage(imageUrl);
      
      toast({
        title: "Success",
        description: "Profile image uploaded successfully",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      // Revert preview on error
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Clean up preview URL
      URL.revokeObjectURL(localPreview);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Trigger disclaimer modal instead of direct file input
   */
  const handleButtonClick = () => {
    setShowDisclaimer(true);
  };

  const handleConfirmUpload = () => {
    setShowDisclaimer(false);
    fileInputRef.current?.click();
  };

  // Display image (preview if uploading, otherwise selected)
  const displayImage = previewUrl || selectedImage;

  return (
    <div className="space-y-2">
      <Label>Profile Picture</Label>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      <div className="flex items-center gap-4">
        {/* Image Display */}
        <div className="relative">
          {displayImage ? (
            <img
              src={displayImage}
              alt="Profile"
              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="bg-secondary rounded-full p-4">
              <User className="h-8 w-8 text-secondary-foreground" />
            </div>
          )}
          
          {/* Upload overlay on hover */}
          {displayImage && !isUploading && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={handleButtonClick}
            >
              <Camera className="h-5 w-5 text-white" />
            </div>
          )}
          
          {/* Loading indicator */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            </div>
          )}
        </div>
        
        {/* Upload Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
              Uploading...
            </>
          ) : selectedImage ? (
            <>
              <Upload className="h-4 w-4" />
              Change Profile Image
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Profile Image
            </>
          )}
        </Button>
      </div>
      
      {/* Upload hint */}
      {!selectedImage && !isUploading && (
        <p className="text-xs text-muted-foreground">
          Upload a profile image (JPG, PNG, or WebP, max 2MB)
        </p>
      )}

      {/* Disclaimer Modal */}
      <AlertDialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Profile Image</AlertDialogTitle>
            <AlertDialogDescription className="text-justify">
              Disclaimer: This feature is intended for profile image updates only. Please upload an appropriate image. Accessing this function may open your device's file explorer, and any unnecessary actions (such as deleting files) are your responsibility. Avoid performing unrelated actions to prevent accidental file loss.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpload} className="bg-green-600 hover:bg-green-700 text-white">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePictureSelector;