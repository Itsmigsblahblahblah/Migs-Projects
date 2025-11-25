import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import girl1 from "@/assets/girl1.png";
import girl2 from "@/assets/girl2.png";
import girl3 from "@/assets/girl3.png";
import boy1 from "@/assets/boy1.png";
import boy2 from "@/assets/boy2.png";
import boy3 from "@/assets/boy3.png";

interface ProfilePictureSelectorProps {
  selectedImage: string | null;
  onSelectImage: (imagePath: string) => void;
  disabled?: boolean;
}

const ProfilePictureSelector = ({ selectedImage, onSelectImage, disabled }: ProfilePictureSelectorProps) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const profileImages = [
    { id: "girl1", src: girl1, alt: "Girl 1" },
    { id: "girl2", src: girl2, alt: "Girl 2" },
    { id: "girl3", src: girl3, alt: "Girl 3" },
    { id: "boy1", src: boy1, alt: "Boy 1" },
    { id: "boy2", src: boy2, alt: "Boy 2" },
    { id: "boy3", src: boy3, alt: "Boy 3" },
  ];

  const selectedImageObj = profileImages.find(img => img.src === selectedImage);

  return (
    <div className="space-y-2">
      <Label>Profile Picture</Label>
      <div className="flex items-center gap-4">
        {selectedImage ? (
          <img
            src={selectedImage}
            alt={selectedImageObj?.alt || "Profile"}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="bg-secondary rounded-full p-4">
            <User className="h-8 w-8 text-secondary-foreground" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowOptions(!showOptions)}
          disabled={disabled}
        >
          {showOptions ? "Cancel" : "Select Avatar"}
        </Button>
      </div>
      
      {showOptions && (
        <div className="mt-4 p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground mb-3">Choose an avatar:</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {profileImages.map((image) => (
              <div
                key={image.id}
                className={`aspect-square rounded-full overflow-hidden cursor-pointer transition-all duration-200 ${
                  selectedImage === image.src
                    ? "ring-4 ring-green-500 scale-105"
                    : "ring-2 ring-gray-200 hover:ring-green-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => !disabled && onSelectImage(image.src)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureSelector;