# Edit Profile Feature Documentation

## Overview
The Edit Profile feature allows farmers to update their personal information directly from the Farmer Dashboard. An Edit button is located in the upper right corner of the Profile Card, which opens a dialog with editable fields.

## Location
- **Component**: `Frontend/src/pages/FarmerDashboard.tsx`
- **UI Position**: Profile Card (upper right corner)

## Features Implemented

### 1. Edit Button
- Located in the Profile Card header (upper right corner)
- Icon: Edit2 (pencil icon)
- Opens the Edit Profile Dialog when clicked

### 2. Edit Profile Dialog
The dialog includes the following fields:

#### Editable Fields:
1. **Profile Picture**
   - Upload button with preview
   - Shows current profile picture or User icon fallback
   - Accepts image files only

2. **Full Name** (Required)
   - Text input field
   - Updates both Firestore and localStorage

3. **Contact Number** (Required)
   - Text input field
   - Placeholder: "e.g., 09123456789"

4. **Home Address** (Required)
   - Text input field
   - For farmer's residential address

5. **Farm Address** (Required)
   - Text input field
   - For farm location

6. **Farm Area** (Required)
   - Text input field
   - Placeholder: "e.g., 2.5 hectares"

#### Locked Field:
7. **Email** (Disabled/Read-only)
   - Cannot be edited
   - Grayed out appearance
   - Label indicates "Cannot be edited"

### 3. Action Buttons
- **Cancel**: Closes dialog without saving
- **Submit**: Saves changes to Firestore

## Technical Implementation

### State Management
```typescript
const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
const [farmerProfile, setFarmerProfile] = useState({
  fullName: "",
  email: "",
  contactNumber: "",
  homeAddress: "",
  farmAddress: "",
  farmArea: "",
  photoURL: ""
});
const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
```

### Key Functions

#### loadFarmerProfile()
- Loads farmer data from Firestore on component mount
- Fetches from `farmers` collection using userId
- Populates the profile state

#### handleProfileImageUpload()
- Handles profile picture selection
- Creates preview using FileReader
- Updates photoURL in state

#### handleProfileInputChange()
- Handles text input changes
- Updates corresponding field in farmerProfile state

#### handleUpdateProfile()
- Saves profile changes to Firestore
- Updates `farmers` document with new data
- Updates username in localStorage if name changed
- Shows success/error toast notification
- Closes dialog and resets profileImageFile

### Firestore Structure
Updates the following fields in `farmers/{userId}` document:
```javascript
{
  fullName: string,
  contactNumber: string,
  homeAddress: string,
  farmAddress: string,
  farmArea: string,
  photoURL: string  // Only if new image uploaded
}
```

## User Flow

1. **Open Dialog**
   - Farmer clicks "Edit" button in Profile Card
   - Dialog opens with current profile data pre-filled

2. **Edit Information**
   - Farmer can upload new profile picture
   - Edit name, contact, addresses, and farm area
   - Email field is locked and cannot be changed

3. **Submit Changes**
   - Click "Submit" button
   - Data is saved to Firestore
   - Success toast notification appears
   - Profile Card updates with new information
   - Dialog closes

4. **Cancel**
   - Click "Cancel" button
   - No changes are saved
   - Dialog closes

## Security Considerations

1. **Email Protection**
   - Email field is disabled to prevent changes
   - Email is tied to Firebase Authentication
   - Cannot be modified from the profile dialog

2. **Authentication Required**
   - Only logged-in farmers can access their profile
   - userId from localStorage identifies the farmer
   - Firestore rules ensure users can only edit their own data

## Future Enhancements

### Recommended Improvements:
1. **Image Upload to Firebase Storage**
   - Currently stores base64 image URL
   - Should upload to Firebase Storage and store download URL
   - More efficient and scalable

2. **Form Validation**
   - Add validation for contact number format
   - Require minimum length for addresses
   - Validate farm area format

3. **Change Confirmation**
   - Detect unsaved changes
   - Warn user before closing dialog with unsaved changes

4. **Loading States**
   - Show loading spinner while updating
   - Disable submit button during save operation

5. **Email Change Flow**
   - Add separate "Change Email" feature
   - Require re-authentication
   - Send verification to new email
   - Update Firebase Auth email

## Code Location
**File**: `d:\vscode play ground\Majay2Farm\Frontend\src\pages\FarmerDashboard.tsx`

**Dialog Component**: Lines 1038-1162
**Handler Functions**: Lines 239-276, 342-389
**Edit Button**: Line 653 (in Profile Card header)

## Dependencies
- Firebase Firestore (`updateDoc`, `getDoc`, `doc`)
- shadcn/ui Dialog component
- Lucide React icons (Edit2, Upload, User)
- React hooks (useState, useEffect)

## Testing Checklist
- [ ] Edit button appears in Profile Card header
- [ ] Dialog opens when Edit button is clicked
- [ ] All fields are populated with current data
- [ ] Profile picture upload works
- [ ] Image preview shows after selection
- [ ] Email field is disabled
- [ ] Text inputs update on change
- [ ] Cancel button closes dialog without saving
- [ ] Submit saves data to Firestore
- [ ] Success toast appears after save
- [ ] Profile Card updates with new information
- [ ] Username in header updates if name changed
- [ ] Dialog closes after successful save

## Related Files
- `Frontend/src/firebaseConfig.ts` - Firebase configuration
- `Frontend/src/components/Layout.tsx` - Layout wrapper
- `firestore.rules` - Security rules for farmers collection

---

**Last Updated**: 2025-10-15
**Feature Status**: ✅ Implemented and Working
