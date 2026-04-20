/**
 * Cloudinary Image Upload Service
 * Handles profile image upload to Cloudinary with optimization
 */

// Cloudinary configuration - read from environment variables
const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// Validate configuration
if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error('[Cloudinary] Missing environment variables: VITE_CLOUD_NAME and VITE_UPLOAD_PRESET must be set in .env file');
}

// Allowed file types and max size
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 300; // Max width/height for optimization

/**
 * Validate image file
 */
export const validateImage = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPG, PNG, and WebP images are allowed.'
    };
  }

  // Check file size
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 2MB. Please choose a smaller image.'
    };
  }

  return { valid: true };
};

/**
 * Optimize image before upload
 * Resizes and compresses image to reduce file size
 */
export const optimizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions (maintain aspect ratio)
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = (height * MAX_DIMENSION) / width;
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = (width * MAX_DIMENSION) / height;
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression (JPEG quality 0.8 or WebP quality 0.8)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to optimize image'));
              }
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            0.8 // Quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Upload image to Cloudinary
 * Returns the secure URL of the uploaded image
 */
export const uploadProfileImage = async (file: File): Promise<string> => {
  try {
    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimize image
    const optimizedBlob = await optimizeImage(file);

    // Create FormData
    const formData = new FormData();
    formData.append('file', optimizedBlob);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'profile_images');

    // Upload to Cloudinary
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();

    // Return optimized URL with transformations
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/w_300,h_300,c_fill/{public_id}.{format}
    const publicId = data.public_id;
    const optimizedUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_300,h_300,c_fill/${publicId}`;

    return optimizedUrl;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete image from Firestore (just clears the field)
 */
export const clearProfileImageFromFirestore = async (
  userId: string,
  db: any,
  collection: (db: any, name: string) => any,
  doc: (db: any, path: string) => any,
  updateDoc: (docRef: any, data: any) => Promise<void>
): Promise<void> => {
  try {
    const usersCollection = collection(db, 'users');
    const userDoc = doc(usersCollection, userId);
    
    await updateDoc(userDoc, {
      profileImage: null
    });
  } catch (error) {
    console.error('Error clearing profile image:', error);
    throw error;
  }
};
