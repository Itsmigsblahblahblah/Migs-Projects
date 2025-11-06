# Account Deletion Request Flow

## Overview
This document describes the farmer account deletion request and approval system implemented in the Majay2Farm application.

## Flow Diagram

```
┌─────────────┐
│   Farmer    │
│  Dashboard  │
└──────┬──────┘
       │
       │ 1. Click "Request Account Deletion"
       │    (in Edit Profile dialog)
       ▼
┌──────────────────────────┐
│ Request Deletion Dialog  │
│ - Explains next steps    │
│ - Admin approval needed  │
└──────┬───────────────────┘
       │
       │ 2. Submit Request
       ▼
┌───────────────────────────┐
│   Firestore Collection    │
│   "deletionRequests"      │
│   {                       │
│     userId: "...",        │
│     status: "pending",    │
│     requestedAt: ...      │
│   }                       │
└───────┬───────────────────┘
       │
       │ 3. Admin Reviews
       ▼
┌──────────────────────────┐
│   Admin Dashboard        │
│   "Deletion Requests"    │
│   Tab                    │
└──────┬───────────────────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
   Approve         Deny        Ignore
       │              │              │
       ▼              ▼              ▼
  status:       status:        status:
  "approved"    "denied"      "pending"
       │              │              │
       │              │              │
       ▼              │              │
┌──────────────────┐ │              │
│ Farmer Dashboard │ │              │
│ Shows:           │ │              │
│ "Delete Account  │ │              │
│  Now (Approved)" │ │              │
└──────┬───────────┘ │              │
       │              │              │
       │ 4. Farmer    │              │
       │    Enters    │              │
       │    Password  │              │
       ▼              ▼              ▼
┌───────────────────────────────────┐
│  Final Deletion                   │
│  - Firestore data deleted         │
│  - Firebase Auth deleted          │
│  - Deletion request deleted       │
└───────────────────────────────────┘
```

## Implementation Details

### 1. Firestore Collection Structure

**Collection:** `deletionRequests`

**Document Schema:**
```typescript
{
  id: string;                          // Auto-generated
  userId: string;                      // Farmer's UID
  username: string;                    // Farmer's username
  email: string;                       // Farmer's email
  fullName: string;                    // Farmer's full name
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Timestamp;              // When request was created
  reviewedAt?: Timestamp;              // When admin reviewed (optional)
  reviewedBy?: string;                 // Admin who reviewed (optional)
}
```

### 2. Farmer Dashboard Changes

**File:** `Frontend/src/pages/FarmerDashboard.tsx`

#### New State Variables
- `isRequestDeleteDialogOpen`: Controls request deletion dialog
- `isRequestingDeletion`: Loading state for request submission
- `deletionRequest`: Stores current deletion request status

#### New Functions
- `checkDeletionRequest(uid)`: Checks if farmer has an existing deletion request
- `handleRequestAccountDeletion()`: Creates a new deletion request in Firestore

#### UI Changes in Edit Profile Dialog

The delete button now shows different states:

1. **No Request:** "Request Account Deletion" button
2. **Pending:** "Deletion Pending Approval" button (disabled)
3. **Approved:** "Delete Account Now (Approved)" button
4. **Denied:** "Request Again (Previous Denied)" button

#### Updated Delete Flow
- `handleDeleteAccount()` now checks if `deletionRequest.status === 'approved'`
- If not approved, shows error message
- If approved, proceeds with deletion and also deletes the deletion request document

### 3. Admin Dashboard Changes

**File:** `Frontend/src/pages/AdminDashboard.tsx`

#### New Interface
```typescript
interface DeletionRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
}
```

#### New State Variables
- `deletionRequests`: Array of all deletion requests

#### New Functions
- `loadDeletionRequests()`: Loads all deletion requests from Firestore
- `handleDeletionRequestAction(requestId, action)`: Approves or denies a request

#### UI Changes

**Removed:**
- Delete button from Registered Farmers tab
- `handleDeleteFarmer()` function
- `farmerToDelete` and `deletingFarmer` state variables
- Delete confirmation dialog

**Added:**
- New "Deletion Requests" tab (5 tabs total now)
- Shows all deletion requests with status badges
- Approve/Deny buttons for pending requests
- Request metadata (requested date, reviewed date, reviewed by)

### 4. Security & Permissions

- **Farmer:** Can only request deletion, cannot delete directly
- **Admin:** Cannot delete accounts directly, can only approve/deny requests
- **Deletion:** Only possible after admin approval AND farmer password confirmation
- **Atomicity:** All related data (farmer profile, crops, reports, deletion request) deleted in a single transaction

## User Experience Flow

### For Farmers

1. **Request Deletion**
   - Navigate to Edit Profile
   - Click "Request Account Deletion"
   - Confirm understanding of the approval process
   - Submit request

2. **Wait for Approval**
   - Button shows "Deletion Pending Approval" (disabled)
   - Cannot proceed with deletion yet

3. **After Approval**
   - Button changes to "Delete Account Now (Approved)"
   - Click to open final deletion dialog
   - Enter password to confirm
   - Account is permanently deleted

4. **If Denied**
   - Button shows "Request Again (Previous Denied)"
   - Can submit a new request

### For Admins

1. **Review Requests**
   - Navigate to "Deletion Requests" tab
   - See all pending, approved, and denied requests
   - View farmer information and request date

2. **Take Action**
   - Click "Approve" to allow farmer to delete their account
   - Click "Deny" to reject the deletion request
   - Action is immediately reflected in the system

3. **Track History**
   - See when request was reviewed
   - See who reviewed it
   - All historical requests remain visible

## Data Deletion

When a farmer completes the deletion (after approval):

1. **Firestore Data** (batch deletion):
   - `/farmers/{userId}` - Farmer profile
   - `/farmerCrops` - All crops where `userId` matches
   - `/farmReports` - All reports where `userId` matches
   - `/deletionRequests` - The deletion request document

2. **Firebase Authentication**:
   - User account is permanently deleted

3. **Local Storage**:
   - All user session data is cleared

## Error Handling

- **No Approval:** Farmer cannot delete without admin approval
- **Wrong Password:** Re-authentication fails, deletion cancelled
- **Network Issues:** Error toast shown, data remains intact
- **Partial Failures:** Batch operation ensures all-or-nothing deletion

## Benefits of This Approach

1. **Controlled Process:** Admin oversight prevents accidental deletions
2. **User Autonomy:** Farmer ultimately controls their account
3. **Audit Trail:** All requests tracked with timestamps and reviewer info
4. **Security:** Requires both admin approval AND password confirmation
5. **Clean UI:** Clear status indicators at every step
6. **Reversible Requests:** Admins can deny requests, farmers can re-request

## Testing Checklist

- [ ] Farmer can submit deletion request
- [ ] Request appears in admin dashboard
- [ ] Admin can approve request
- [ ] Admin can deny request
- [ ] Approved request allows farmer to delete
- [ ] Denied request allows farmer to re-request
- [ ] Password validation works correctly
- [ ] All data is deleted after final confirmation
- [ ] Deletion request is removed after account deletion
- [ ] Error handling works for all failure cases
