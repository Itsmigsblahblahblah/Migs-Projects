# Firestore Security Rules Setup Guide

## Overview
This guide explains how to deploy the Firestore security rules to enable the deletion request feature.

## Files
- **`firestore.rules`** - Security rules for Firestore collections

## Deployment Steps

### Method 1: Using Firebase Console (Easiest)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select your project: `Majay2Farm`

2. **Navigate to Firestore Rules**
   - Click on **Firestore Database** in the left sidebar
   - Click on the **Rules** tab at the top

3. **Copy and Paste Rules**
   - Open the `firestore.rules` file from your project
   - Select all content (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into the Firebase Console editor (Ctrl+V)

4. **Publish Rules**
   - Click the **Publish** button
   - Wait for confirmation: "Rules published successfully"

### Method 2: Using Firebase CLI

1. **Install Firebase CLI** (if not already installed)
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project** (if not already done)
   ```bash
   firebase init firestore
   ```
   - Select: Use an existing project
   - Choose: Majay2Farm
   - Firestore rules file: `firestore.rules`
   - Firestore indexes file: `firestore.indexes.json`

4. **Deploy Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Security Rules Explanation

### Deletion Requests Collection

```javascript
match /deletionRequests/{requestId} {
  // Farmers can create their own deletion request
  allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
  
  // Admins can read and update all requests
  allow read, update: if isAdmin();
  
  // Farmers can read their own requests
  allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
  
  // Allow deletion if approved or by admin
  allow delete: if isAdmin() || 
    (isSignedIn() && resource.data.userId == request.auth.uid && resource.data.status == 'approved');
}
```

### Key Points

1. **Farmers can:**
   - Create deletion requests (only for themselves)
   - Read their own deletion requests
   - Delete their own deletion requests (only if status is 'approved')

2. **Admins can:**
   - Read all deletion requests
   - Update request status (approve/deny)
   - Delete any deletion request

3. **Security:**
   - Users can only create requests with their own `userId`
   - Only admin@majayjay.farm can approve/deny requests
   - Requests can only be deleted after approval or by admin

## Testing Rules

### Test 1: Farmer Creates Request
```javascript
// Should SUCCEED
// User: farmer@example.com (uid: "farmer123")
// Action: Create document in deletionRequests
{
  userId: "farmer123",
  username: "Juan",
  email: "farmer@example.com",
  status: "pending",
  requestedAt: Timestamp.now()
}
```

### Test 2: Admin Reads Requests
```javascript
// Should SUCCEED
// User: admin@majayjay.farm
// Action: Read all documents in deletionRequests
```

### Test 3: Farmer Reads Own Request
```javascript
// Should SUCCEED
// User: farmer@example.com (uid: "farmer123")
// Action: Read document where userId == "farmer123"
```

### Test 4: Farmer Reads Other's Request
```javascript
// Should FAIL
// User: farmer@example.com (uid: "farmer123")
// Action: Read document where userId == "other456"
```

### Test 5: Admin Updates Request
```javascript
// Should SUCCEED
// User: admin@majayjay.farm
// Action: Update document, set status to "approved"
```

## Troubleshooting

### Issue: "Missing or insufficient permissions"

**Cause:** Firestore rules are blocking the operation

**Solution:**
1. Verify rules are deployed correctly
2. Check user is authenticated
3. For admin operations, verify email is exactly `admin@majayjay.farm`

### Issue: Farmer cannot create request

**Check:**
1. User is signed in
2. `request.resource.data.userId` matches `request.auth.uid`
3. All required fields are present

### Issue: Admin cannot see requests

**Check:**
1. Admin is logged in as `admin@majayjay.farm`
2. Rules are deployed
3. Check browser console for errors

## Verification

After deploying rules, verify by:

1. **Test farmer request creation:**
   - Login as farmer
   - Submit deletion request
   - Check Firestore Console for new document

2. **Test admin access:**
   - Login as admin
   - Go to "Deletion Requests" tab
   - Verify requests are visible

3. **Test approval:**
   - As admin, click "Approve"
   - Verify status changes to "approved"
   - As farmer, verify button changes to "Delete Account Now (Approved)"

## Important Notes

- **Admin Email:** Only `admin@majayjay.farm` has admin privileges
- **Security:** Never hardcode admin credentials in frontend
- **Testing:** Use Firebase Emulator for local testing
- **Production:** Always test rules in staging before deploying to production
