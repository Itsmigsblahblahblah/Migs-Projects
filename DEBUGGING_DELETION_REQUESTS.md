# Debugging Guide: Deletion Requests Not Showing in Admin Dashboard

## Problem
Deletion requests submitted by farmers are not appearing in the Admin Dashboard's "Deletion Requests" tab.

## Debugging Steps

### Step 1: Check Browser Console (Farmer Side)
1. Open browser DevTools (F12)
2. Go to farmer dashboard
3. Click "Request Account Deletion"
4. Submit the request
5. Look for these console messages:
   ```
   Creating deletion request: { userId, username, email, fullName, status, requestedAt }
   Deletion request created with ID: [document-id]
   ```

### Step 2: Check Firebase Console
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to: **Firestore Database**
4. Look for collection: **`deletionRequests`**
5. Verify:
   - ✅ Collection exists
   - ✅ Document(s) exist with the request data
   - ✅ Document fields: `userId`, `username`, `email`, `fullName`, `status`, `requestedAt`

### Step 3: Check Browser Console (Admin Side)
1. Login as admin
2. Open browser DevTools (F12)
3. Go to Admin Dashboard
4. Click "Deletion Requests" tab
5. Look for these console messages:
   ```
   [Admin] Loading deletion requests...
   [Admin] Found X deletion request(s)
   [Admin] Deletion request: [id] { data }
   [Admin] Total deletion requests loaded: X
   [Admin] Deletion requests data: [array]
   ```

### Step 4: Manually Refresh
1. In Admin Dashboard
2. Click the **"Refresh"** button in the Deletion Requests tab
3. Check console for updated logs

## Common Issues & Solutions

### Issue 1: Request Not Created
**Symptoms:** No document in Firestore `deletionRequests` collection

**Possible Causes:**
- Firestore security rules blocking write
- Network error
- Missing user data

**Solution:**
```javascript
// Check console for error message like:
// "Error requesting account deletion: [error details]"
```

### Issue 2: Request Created but Not Loading
**Symptoms:** Document exists in Firestore but not showing in admin

**Possible Causes:**
- Admin not fetching data
- Data format mismatch
- Firestore security rules blocking read

**Solution:**
1. Check console for: `[Admin] Error loading deletion requests`
2. Verify Firestore security rules allow admin to read

### Issue 3: Firestore Security Rules
Check if your `firestore.rules` allows:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deletion requests - farmers can create, admins can read/update
    match /deletionRequests/{requestId} {
      // Farmers can create their own deletion request
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid;
      
      // Admins can read and update all requests
      allow read, update: if request.auth != null 
        && request.auth.token.email == 'admin@majayjay.farm';
      
      // Farmers can read their own requests
      allow read: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      
      // Allow deletion if approved (for cleanup during account deletion)
      allow delete: if request.auth != null 
        && resource.data.userId == request.auth.uid 
        && resource.data.status == 'approved';
    }
  }
}
```

## Testing Checklist

- [ ] Farmer can submit deletion request (check console)
- [ ] Request appears in Firebase Console → Firestore → deletionRequests
- [ ] Admin can see request in "Deletion Requests" tab
- [ ] Admin can click "Refresh" button to reload
- [ ] Request count shows correctly (X pending, Y total)
- [ ] Console shows loading logs with request data
- [ ] No errors in browser console

## Expected Console Output

### Farmer Side (Success):
```
Creating deletion request: {
  userId: "abc123",
  username: "Juan Dela Cruz",
  email: "juan@example.com",
  fullName: "Juan Dela Cruz",
  status: "pending",
  requestedAt: Timestamp
}
Deletion request created with ID: XYZ789
```

### Admin Side (Success):
```
[Admin] Loading deletion requests...
[Admin] Found 1 deletion request(s)
[Admin] Deletion request: XYZ789 {
  userId: "abc123",
  username: "Juan Dela Cruz",
  email: "juan@example.com",
  fullName: "Juan Dela Cruz",
  status: "pending",
  requestedAt: Timestamp
}
[Admin] Total deletion requests loaded: 1
[Admin] Deletion requests data: [{ id: "XYZ789", userId: "abc123", ... }]
```

## Quick Fix Commands

### Clear All Deletion Requests (if testing):
```javascript
// In Firebase Console → Firestore → Run in Query
const snapshot = await firebase.firestore().collection('deletionRequests').get();
snapshot.forEach(doc => doc.ref.delete());
```

### Manually Create Test Request:
```javascript
// In Firebase Console → Firestore → Add Document
Collection: deletionRequests
Document ID: (auto-generated)
Fields:
  userId: "test-user-id"
  username: "Test User"
  email: "test@example.com"
  fullName: "Test User"
  status: "pending"
  requestedAt: (timestamp) now
```

## Next Steps

If issue persists after checking all above:
1. Share the browser console logs (both farmer and admin side)
2. Share a screenshot of Firestore `deletionRequests` collection
3. Share your current Firestore security rules
