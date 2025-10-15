# Firebase Authentication Account Deletion Solution

## Problem
When admin deletes a farmer account from Firestore, the Firebase Authentication user account remains active. This means:
- ❌ User can still login with email/password
- ❌ They see "Farmer account not found" error
- ❌ Account is not fully deleted

## Solution: Firebase Cloud Function

The **proper and secure way** to delete Firebase Auth accounts is using **Firebase Admin SDK** in a **Cloud Function**.

### Why Cloud Function?
- ✅ Firebase Admin SDK has elevated permissions
- ✅ Can delete Auth users securely
- ✅ Runs on Google's servers (not browser)
- ✅ Atomic operation with Firestore deletion
- ✅ No security risks

### Why NOT Frontend?
- ❌ Browser cannot delete other users' Auth accounts
- ❌ Security risk if implemented in frontend
- ❌ User needs to be signed in to delete their own account
- ❌ Requires re-authentication

---

## Implementation Guide

### Step 1: Install Firebase CLI

If you don't have Firebase CLI installed:

```bash
npm install -g firebase-tools
```

### Step 2: Initialize Firebase Functions

In your project root:

```bash
cd "d:/vscode play ground/Majay2Farm"
firebase login
firebase init functions
```

Select:
- ✅ Use existing project (select your project)
- ✅ JavaScript or TypeScript (recommend TypeScript)
- ✅ ESLint: Yes
- ✅ Install dependencies: Yes

This creates a `functions/` folder.

### Step 3: Install Dependencies

```bash
cd functions
npm install
```

### Step 4: Create Delete Function

Create `functions/src/index.ts` (or `index.js`):

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Delete farmer account and all associated data
export const deleteFarmerAccount = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Verify admin email
  const adminEmail = context.auth.token.email;
  if (adminEmail !== 'admin@majayjay.farm') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admin can delete farmer accounts'
    );
  }

  const { farmerId } = data;

  if (!farmerId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'farmerId is required'
    );
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // 1. Delete farmer document
    const farmerRef = db.collection('farmers').doc(farmerId);
    batch.delete(farmerRef);

    // 2. Delete all farmer's crops
    const cropsSnapshot = await db
      .collection('farmerCrops')
      .where('userId', '==', farmerId)
      .get();
    
    cropsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 3. Delete all farmer's reports
    const reportsSnapshot = await db
      .collection('farmReports')
      .where('userId', '==', farmerId)
      .get();
    
    reportsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit Firestore deletions
    await batch.commit();

    // 4. Delete Firebase Auth user
    await admin.auth().deleteUser(farmerId);

    console.log(`Successfully deleted farmer ${farmerId}`);

    return {
      success: true,
      message: 'Farmer account and all data deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting farmer:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete farmer account',
      error
    );
  }
});
```

### Step 5: Deploy Cloud Function

```bash
cd functions
npm run build  # If using TypeScript
cd ..
firebase deploy --only functions
```

### Step 6: Update Frontend Code

Update `AdminDashboard.tsx` to call the Cloud Function:

```typescript
// Add import at the top
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

// Add in component
const functions = getFunctions();

// Update handleDeleteFarmer function
const handleDeleteFarmer = async () => {
  if (!farmerToDelete) return;

  setDeletingFarmer(true);
  try {
    // Call Cloud Function
    const deleteFarmerAccount = httpsCallable(functions, 'deleteFarmerAccount');
    const result = await deleteFarmerAccount({ farmerId: farmerToDelete.uid });

    console.log('Delete result:', result.data);

    // Update local state
    setFarmers(prev => prev.filter(f => f.uid !== farmerToDelete.uid));
    setStats(prev => ({
      ...prev,
      activeFarmers: prev.activeFarmers - 1
    }));

    toast({
      title: "Farmer Deleted",
      description: `${farmerToDelete.fullName}'s account and all data (including Firebase Auth) have been permanently deleted.`,
    });

    setFarmerToDelete(null);
  } catch (error: any) {
    console.error("Error deleting farmer:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to delete farmer account.",
      variant: "destructive",
    });
  } finally {
    setDeletingFarmer(false);
  }
};
```

### Step 7: Update firebaseConfig.ts

Add Firebase Functions initialization:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
```

---

## Alternative: Simple HTTP Endpoint

If you don't want to use Cloud Functions, you can create a simple backend:

### Using Node.js + Express

**1. Create backend folder:**
```bash
mkdir backend
cd backend
npm init -y
npm install express firebase-admin cors
```

**2. Create `backend/server.js`:**
```javascript
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// Delete farmer endpoint
app.post('/delete-farmer', async (req, res) => {
  try {
    const { farmerId, adminEmail } = req.body;

    // Verify admin
    if (adminEmail !== 'admin@majayjay.farm') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const db = admin.firestore();
    const batch = db.batch();

    // Delete Firestore data
    batch.delete(db.collection('farmers').doc(farmerId));
    
    const crops = await db.collection('farmerCrops')
      .where('userId', '==', farmerId).get();
    crops.forEach(doc => batch.delete(doc.ref));
    
    const reports = await db.collection('farmReports')
      .where('userId', '==', farmerId).get();
    reports.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();

    // Delete Auth user
    await admin.auth().deleteUser(farmerId);

    res.json({ success: true, message: 'Farmer deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete farmer' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**3. Get Service Account Key:**
- Go to Firebase Console → Project Settings → Service Accounts
- Click "Generate New Private Key"
- Save as `backend/serviceAccountKey.json`

**4. Run backend:**
```bash
node server.js
```

**5. Update frontend to call backend:**
```typescript
const handleDeleteFarmer = async () => {
  const response = await fetch('http://localhost:3000/delete-farmer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmerId: farmerToDelete.uid,
      adminEmail: 'admin@majayjay.farm'
    })
  });
  
  const result = await response.json();
  // Handle result...
};
```

---

## Comparison

| Feature | Cloud Function | Node.js Backend | Frontend Only |
|---------|---------------|-----------------|---------------|
| **Delete Auth User** | ✅ Yes | ✅ Yes | ❌ No |
| **Security** | ✅ Excellent | ✅ Good | ❌ Poor |
| **Setup** | Medium | Easy | Very Easy |
| **Hosting** | Free (Firebase) | Need hosting | N/A |
| **Scalability** | ✅ Auto-scales | Manual | N/A |
| **Cost** | Free tier generous | Hosting cost | Free |

---

## Recommended Approach: Cloud Function

**Advantages:**
- ✅ Most secure
- ✅ Scalable
- ✅ No server management
- ✅ Free tier (generous limits)
- ✅ Integrated with Firebase

**Steps Summary:**
1. Install Firebase CLI
2. Initialize Cloud Functions
3. Create delete function
4. Deploy to Firebase
5. Update frontend to call function
6. Test and verify

---

## Testing

After implementation:

1. **Deploy function:**
```bash
firebase deploy --only functions
```

2. **Test in frontend:**
- Login as admin
- Try deleting a farmer
- Check Firebase Console:
  - ✅ Firestore data deleted
  - ✅ Auth user deleted

3. **Verify deletion:**
- Check Firebase Authentication users list
- Try logging in with deleted account
- Should see "user not found" error

---

## Cost Estimation

Firebase Cloud Functions Free Tier:
- 2M invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

For your use case (admin deleting farmers):
- Likely < 100 deletions/month
- **Cost: $0 (within free tier)**

---

## Troubleshooting

### Error: "firebase-admin not found"
```bash
cd functions
npm install firebase-admin
```

### Error: "Permission denied"
Make sure admin email is verified in the function.

### Error: "CORS"
Add proper CORS configuration in Cloud Function:
```typescript
export const deleteFarmerAccount = functions
  .runWith({ cors: true })
  .https.onCall(async (data, context) => {
    // ...
  });
```

---

## Summary

To fully delete farmer accounts including Firebase Auth:

**Option 1 (Recommended): Cloud Function**
- Secure, scalable, free
- Takes 30 minutes to set up
- Best long-term solution

**Option 2: Node.js Backend**
- Simple to understand
- Needs hosting
- Good for custom requirements

**Option 3: Frontend Only**
- Cannot delete Auth accounts
- Current implementation
- Not recommended

Choose **Cloud Function** for production! 🚀
