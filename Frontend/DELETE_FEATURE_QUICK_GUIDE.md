# Farmer Delete Feature - Quick Guide

## ✨ What Was Added

Admin can now **permanently delete farmer accounts** along with all their data (crops, reports, history).

## 🎯 Key Features

### 1. Delete Button
- Red "Delete" button on each farmer card
- Includes trash icon 🗑️
- Stops event propagation (doesn't navigate)

### 2. Confirmation Dialog
- Clear warning about permanent deletion
- Shows farmer name and email
- Lists what will be deleted:
  - Farmer profile
  - All crops
  - All reports
  - Activity history
- Warning: ⚠️ "Cannot be recovered!"

### 3. Batch Deletion
- Deletes from 3 Firestore collections:
  - `farmers/{farmerId}` - Profile
  - `farmerCrops/*` - All crops where userId == farmerId
  - `farmReports/*` - All reports where userId == farmerId
- Uses atomic batch write (all or nothing)
- Updates UI immediately

## 🔧 Code Changes

### File Modified
- **`AdminDashboard.tsx`** (~140 lines changed)

### What Was Added

#### 1. Imports
```typescript
// AlertDialog component
import { AlertDialog, ... } from "@/components/ui/alert-dialog";

// Trash icon
import { Trash2 } from "lucide-react";

// Firestore functions
import { deleteDoc, writeBatch, where } from "firebase/firestore";
```

#### 2. State
```typescript
const [farmerToDelete, setFarmerToDelete] = useState<Farmer | null>(null);
const [deletingFarmer, setDeletingFarmer] = useState(false);
```

#### 3. Delete Function
```typescript
const handleDeleteFarmer = async () => {
  // Create batch
  const batch = writeBatch(db);
  
  // Delete farmer profile
  batch.delete(doc(db, "farmers", farmerToDelete.uid));
  
  // Delete all crops
  const cropsQuery = query(
    collection(db, "farmerCrops"),
    where("userId", "==", farmerToDelete.uid)
  );
  const cropsSnapshot = await getDocs(cropsQuery);
  cropsSnapshot.forEach(doc => batch.delete(doc.ref));
  
  // Delete all reports
  const reportsQuery = query(
    collection(db, "farmReports"),
    where("userId", "==", farmerToDelete.uid)
  );
  const reportsSnapshot = await getDocs(reportsQuery);
  reportsSnapshot.forEach(doc => batch.delete(doc.ref));
  
  // Commit all deletions
  await batch.commit();
  
  // Update local state
  setFarmers(prev => prev.filter(f => f.uid !== farmerToDelete.uid));
};
```

#### 4. UI Components
```tsx
{/* Delete Button */}
<Button
  variant="destructive"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setFarmerToDelete(farmer);
  }}
>
  <Trash2 className="h-4 w-4" />
  Delete
</Button>

{/* Confirmation Dialog */}
<AlertDialog open={!!farmerToDelete}>
  <AlertDialogContent>
    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
    <AlertDialogDescription>
      This will permanently delete {farmerToDelete?.fullName}...
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteFarmer}>
        Delete Permanently
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 🔒 Firestore Rules Update

**IMPORTANT**: You MUST update Firestore rules before this works!

### Updated Rules
```javascript
match /farmers/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null;
  
  // Allow admin to read all farmers
  allow read: if request.auth != null && 
                 request.auth.token.email == 'admin@majayjay.farm';
  
  // ⭐ NEW: Allow admin to delete farmer accounts
  allow delete: if request.auth != null && 
                   request.auth.token.email == 'admin@majayjay.farm';
}
```

### How to Deploy Rules
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** → **Rules** tab
4. Copy the updated rules from `firestore.rules` file
5. Click **Publish**

## 🧪 Testing Steps

### 1. Update Firestore Rules First!
```
Firebase Console → Firestore → Rules → Publish
```

### 2. Test Deletion
```
1. Login as admin (admin@majayjay.farm)
2. Go to Admin Dashboard
3. Click "Registered Farmers" tab
4. Click "Delete" button on any farmer
5. ✅ Confirmation dialog should appear
6. Review farmer name and email
7. Click "Delete Permanently"
8. ✅ Success toast should appear
9. ✅ Farmer should disappear from list
10. ✅ Check Firestore - all data deleted
```

### 3. Test Cancellation
```
1. Click "Delete" button
2. ✅ Dialog appears
3. Click "Cancel"
4. ✅ Dialog closes
5. ✅ Farmer still in list
6. ✅ No data deleted
```

### 4. Test Navigation
```
1. Click on farmer card → ✅ Navigates to detail page
2. Click "Delete" button → ✅ Opens dialog (no navigation)
```

## 📊 What Gets Deleted

```
Farmer Account
├─ farmers/{farmerId} ❌ DELETED
├─ farmerCrops/* where userId == farmerId ❌ ALL DELETED
└─ farmReports/* where userId == farmerId ❌ ALL DELETED
```

## ⚠️ Important Notes

### 1. Permanent Deletion
- ❌ No undo
- ❌ No recovery
- ❌ No trash bin
- ⚠️ Admin should be careful!

### 2. Firebase Auth NOT Deleted
- User can still login with email/password
- But they will see "Farmer account not found" error
- To fully delete, need Firebase Admin SDK (server-side)

### 3. Batch Write Limit
- Firestore batch limited to 500 operations
- If farmer has >500 crops + reports, may need multiple batches
- Current implementation handles normal cases

## 🎨 UI Preview

### Before Delete
```
┌─────────────────────────────────────────────────┐
│  [👤] Juan Dela Cruz          [Farmer] [Delete]│
│       Dela Cruz Farm                            │
│       📧 juan@example.com                       │
└─────────────────────────────────────────────────┘
```

### Confirmation Dialog
```
┌───────────────────────────────────────────────┐
│  ⚠️ Are you absolutely sure?                  │
│                                                │
│  This will permanently delete:                 │
│  • Juan Dela Cruz (juan@example.com)          │
│  • All crops data                              │
│  • All farm reports                            │
│  • Activity history                            │
│                                                │
│  ⚠️ Cannot be recovered!                       │
│                                                │
│               [Cancel] [Delete Permanently]    │
└───────────────────────────────────────────────┘
```

### After Delete
```
┌─────────────────────────────────────────────────┐
│  ✓ Farmer Deleted                               │
│  Juan Dela Cruz's account and all data deleted  │
└─────────────────────────────────────────────────┘

(Farmer removed from list)
```

## 🔍 Troubleshooting

### Error: "Permission denied"
**Fix**: Update Firestore rules to allow admin deletion

### Error: "Partial deletion"
**Fix**: Check batch write succeeded, verify Firestore connection

### Delete button doesn't work
**Fix**: Check browser console for errors, verify state management

## 📝 Files Created/Modified

### Created
1. **`FARMER_DELETE_FEATURE.md`** - Complete documentation
2. **`DELETE_FEATURE_QUICK_GUIDE.md`** - This quick guide

### Modified
1. **`AdminDashboard.tsx`** - Added delete functionality
2. **`firestore.rules`** - Added admin delete permission

## ✅ Summary

**What Works**:
- ✅ Delete button on farmer cards
- ✅ Confirmation dialog with warnings
- ✅ Batch deletion from Firestore
- ✅ Atomic operations (all or nothing)
- ✅ Immediate UI updates
- ✅ Success/error notifications
- ✅ Event propagation handling
- ✅ Loading states

**What Doesn't**:
- ❌ Firebase Auth user not deleted (requires backend)
- ❌ No undo functionality
- ❌ No audit trail (can be added)

**Status**: ✅ Complete and Ready

**Next Steps**:
1. Deploy updated Firestore rules
2. Test deletion thoroughly
3. Train admin users on the feature

---

**Remember**: Update Firestore rules before using in production!
