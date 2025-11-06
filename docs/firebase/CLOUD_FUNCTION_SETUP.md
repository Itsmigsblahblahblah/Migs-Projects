# Complete Firebase Cloud Function Setup Guide

## What This Does

This setup will enable **complete account deletion** including:
- ✅ Firebase Authentication user account
- ✅ Firestore farmer profile
- ✅ All crops data
- ✅ All farm reports
- ✅ Activity history

Currently, only Firestore data is deleted. After this setup, the Firebase Auth account will also be deleted.

---

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Firebase CLI** installed
3. **Admin access** to your Firebase project

---

## Step-by-Step Setup

### Step 1: Install Firebase CLI

Open terminal and run:

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window. Login with your Google account that has access to the Firebase project.

### Step 3: Initialize Firebase Project

Navigate to your project root:

```bash
cd "d:/vscode play ground/Majay2Farm"
```

Initialize Firebase (if not already done):

```bash
firebase init
```

**When prompted, select:**
- ✅ Functions: Configure a Cloud Functions directory
- ✅ Use an existing project → Select your Majayjay Farm project
- ✅ Language: **TypeScript**
- ✅ ESLint: Yes
- ✅ Install dependencies: Yes

This creates a `functions/` folder with the necessary files.

### Step 4: Install Dependencies

```bash
cd functions
npm install
```

This installs:
- `firebase-functions` - Cloud Functions SDK
- `firebase-admin` - Admin SDK (can delete Auth users)
- TypeScript and linting tools

### Step 5: Verify Files Created

I've already created these files for you:
```
functions/
├── package.json ✅ (created)
├── tsconfig.json ✅ (created)
└── src/
    └── index.ts ✅ (created with delete function)
```

### Step 6: Build the Functions

```bash
cd functions
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` folder.

### Step 7: Deploy to Firebase

From the project root:

```bash
firebase deploy --only functions
```

**What this does:**
- Uploads your Cloud Functions to Google's servers
- Makes them available at Firebase endpoints
- Free to deploy (generous free tier)

**Expected output:**
```
✔ functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔ functions: required API cloudfunctions.googleapis.com is enabled
✔ functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged /path/to/functions (XX KB) for uploading
✔ functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function deleteFarmerAccount...
✔ functions[deleteFarmerAccount]: Successful create operation.

✔ Deploy complete!
```

### Step 8: Test the Cloud Function

After deployment, try deleting a farmer account from the admin dashboard:

1. Login as admin
2. Go to "Registered Farmers"
3. Click "Delete" on any farmer
4. Confirm deletion

**Expected result:**
```
✓ Farmer Deleted
  Juan Dela Cruz's account and all data (including Firebase 
  Authentication) have been permanently deleted.
```

**Verify in Firebase Console:**
- Go to Authentication → Users
- The deleted user should be gone
- Go to Firestore → farmers collection
- The farmer document should be gone

---

## How It Works

### Frontend Code Flow

1. Admin clicks "Delete" button
2. `handleDeleteFarmer()` function is called
3. **First, tries Cloud Function:**
   ```typescript
   const deleteFarmerAccount = httpsCallable(functions, 'deleteFarmerAccount');
   await deleteFarmerAccount({ farmerId: farmer.uid });
   ```
4. **If Cloud Function fails** (not deployed), falls back to Firestore-only deletion
5. Shows appropriate success message

### Cloud Function Flow

1. Receives `farmerId` from frontend
2. **Verifies admin authentication** (email must be `admin@majayjay.farm`)
3. **Deletes from Firestore:**
   - Farmer profile
   - All crops where `userId == farmerId`
   - All reports where `userId == farmerId`
4. **Deletes from Firebase Auth:**
   - `admin.auth().deleteUser(farmerId)`
5. Returns success response
6. Frontend updates UI

### Security

- ✅ Only callable by authenticated users
- ✅ Only admin email can execute
- ✅ Verifies farmer exists before deletion
- ✅ Atomic Firestore operations (batch write)
- ✅ Proper error handling
- ✅ Logging for debugging

---

## Configuration Files Explained

### `functions/package.json`

Defines Cloud Function dependencies:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",  // Admin SDK
    "firebase-functions": "^4.5.0" // Cloud Functions
  }
}
```

### `functions/tsconfig.json`

TypeScript compiler configuration:
```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "outDir": "lib"
  }
}
```

### `functions/src/index.ts`

Your Cloud Function code:
```typescript
export const deleteFarmerAccount = functions.https.onCall(async (data, context) => {
  // Verify admin
  // Delete Firestore data
  // Delete Auth user
  // Return success
});
```

---

## Troubleshooting

### Error: "Firebase CLI not found"

**Solution:**
```bash
npm install -g firebase-tools
```

### Error: "Not authorized"

**Solution:**
```bash
firebase login
firebase use --add
```
Select your project from the list.

### Error: "Functions not deploying"

**Solution:**
Check your Firebase project billing. Cloud Functions require:
- Blaze plan (pay-as-you-go)
- BUT: Has generous free tier
- Likely $0/month for your usage

To upgrade:
1. Go to Firebase Console
2. Click "Upgrade" in the bottom left
3. Select "Blaze" plan
4. Add payment method (won't be charged unless you exceed free tier)

**Free Tier Limits:**
- 2M function invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

Your usage (admin deleting farmers):
- ~10-100 deletions/month
- **Cost: $0** (well within free tier)

### Error: "Permission denied" when calling function

**Solution:**
Check that admin is logged in and email matches `admin@majayjay.farm`

### Error: "Function not found"

**Solution:**
Wait 1-2 minutes after deployment for function to be available, or redeploy:
```bash
firebase deploy --only functions
```

### Error: TypeScript compilation errors

**Solution:**
```bash
cd functions
npm install
npm run build
```

---

## Testing Checklist

After deployment:

- [ ] Login as admin
- [ ] Navigate to "Registered Farmers"
- [ ] Click "Delete" on a test farmer
- [ ] Confirm deletion
- [ ] ✅ Success toast appears
- [ ] ✅ Farmer removed from UI
- [ ] ✅ Check Firebase Console → Authentication → User deleted
- [ ] ✅ Check Firebase Console → Firestore → Data deleted
- [ ] Try logging in with deleted account
- [ ] ✅ Should see "user not found" error

---

## Viewing Function Logs

To see function execution logs:

```bash
firebase functions:log
```

Or in Firebase Console:
1. Go to Functions
2. Click on `deleteFarmerAccount`
3. Click "Logs" tab

---

## Cost Estimation

### Free Tier (Spark Plan)
- ❌ Cannot deploy Cloud Functions

### Blaze Plan (Pay-as-you-go)
- ✅ Can deploy Cloud Functions
- Free tier: 2M invocations/month

### Your Estimated Cost
- Deletions per month: ~10-100
- Cost: **$0/month** (within free tier)

Even if you delete 1000 farmers/month:
- Still $0 (well within 2M limit)

---

## Alternative: Manual Deletion

If you don't want to set up Cloud Functions, you can manually delete Auth users:

1. Go to Firebase Console
2. Authentication → Users
3. Find the user by email
4. Click "..." → Delete user

But this is tedious for multiple deletions.

---

## Benefits of Cloud Function Approach

| Feature | With Cloud Function | Without (Current) |
|---------|-------------------|------------------|
| Delete Auth User | ✅ Automatic | ❌ Manual only |
| Delete Firestore Data | ✅ Automatic | ✅ Automatic |
| Atomic Operation | ✅ Yes | ⚠️ Partial |
| Admin-Only | ✅ Enforced | ✅ Enforced |
| Logging | ✅ Yes | ❌ No |
| Error Handling | ✅ Better | ⚠️ Basic |
| Setup Time | 30 minutes | 0 minutes |
| Monthly Cost | $0 | $0 |

---

## Commands Summary

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Navigate to project
cd "d:/vscode play ground/Majay2Farm"

# Initialize functions (if not done)
firebase init functions

# Install dependencies
cd functions
npm install

# Build functions
npm run build

# Deploy functions
cd ..
firebase deploy --only functions

# View logs
firebase functions:log
```

---

## Next Steps

1. **Deploy the Cloud Function** following steps above
2. **Test deletion** with a test farmer account
3. **Verify** both Firestore and Auth deletion
4. **Document** the process for other admins

---

## Support

If you encounter issues:

1. Check Firebase Console → Functions for errors
2. Run `firebase functions:log` to see detailed logs
3. Verify billing is enabled (Blaze plan)
4. Check admin email matches `admin@majayjay.farm`

---

## Summary

**Current State:**
- ❌ Only Firestore data deleted
- ❌ Auth user remains (can't login but account exists)

**After Setup:**
- ✅ Complete deletion (Firestore + Auth)
- ✅ Atomic operation
- ✅ Better error handling
- ✅ Logging and monitoring

**Setup Time:** ~30 minutes
**Cost:** $0/month (free tier)
**Difficulty:** Easy (follow steps above)

🚀 **Ready to deploy!**
