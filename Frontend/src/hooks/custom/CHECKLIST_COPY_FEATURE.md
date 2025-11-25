# Checklist Copy Feature Documentation

## Feature Description
When a user adds a new crop of the same type as an existing crop that has detailed maintenance instructions, the system automatically copies those instructions to the new crop.

## Implementation Details

### 1. Modified Files

#### CropContext.tsx
- Updated the `addCrop` function signature to accept an optional `checklist` parameter
- Added `detailedInstructions` property to the `ChecklistItem` interface

#### useCropManagement.ts
- Enhanced the `handleAddCrop` function to:
  1. Check for existing crops of the same name with detailed instructions
  2. Copy the checklist structure from the existing crop
  3. Reset completion status and timestamps for the new crop
  4. Preserve all detailed instructions

### 2. Logic Flow

1. User submits a new crop via the add crop form
2. The system checks if there are any existing crops with the same name
3. Among those crops, it looks for any that have checklist items with detailed instructions
4. If found, it copies the entire checklist structure:
   - Preserves titles, categories, and detailed instructions
   - Resets completion status to `false`
   - Removes completion timestamps
5. The copied checklist is passed to the `addCrop` function
6. The new crop is saved to Firestore with the copied checklist

### 3. Key Implementation Points

- Uses case-insensitive comparison for crop names
- Only copies checklists that have at least one item with detailed instructions
- Maintains data integrity by resetting completion status for new crops
- Provides user feedback when instructions are copied

### 4. Benefits

- Reduces repetitive data entry for farmers
- Ensures consistency in maintenance practices
- Saves time when managing multiple instances of the same crop
- Maintains all valuable detailed instructions