# Firestore Index Setup Guide

This guide explains how to set up the required composite index for the admin messages feature to work optimally.

## Required Index

The application needs a composite index on the `adminMessages` collection to efficiently query messages by receiver and sort by timestamp.

### Index Details

- **Collection**: `adminMessages`
- **Fields**:
  1. `receiverId` (Ascending)
  2. `timestamp` (Descending)

## How to Create the Index

### Option 1: Using the Firebase Console (Recommended)

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Indexes** tab
5. Click on **Create index**
6. Set the following values:
   - **Collection ID**: `adminMessages`
   - **Index type**: `Single field` or `Composite` (select Composite)
   - **Fields**:
     - Field path: `receiverId`, Mode: `Ascending`
     - Field path: `timestamp`, Mode: `Descending`
   - **Query scope**: `Collection`
7. Click **Create**

### Option 2: Using the Direct Link from Error Message

If you have received the error message with a direct link, you can simply click on that link to automatically create the required index.

## Why This Index is Needed

The application queries the `adminMessages` collection with the following query:

```javascript
const messagesQuery = query(
  collection(db, "adminMessages"),
  where("receiverId", "==", userId),
  orderBy("timestamp", "desc")
);
```

This query requires a composite index on `receiverId` and `timestamp` to run efficiently.

## Fallback Behavior

If the index is not created, the application will still work but with reduced performance. It will:
1. First run a simple query without ordering to check if any messages exist
2. If messages exist, attempt the ordered query
3. If the ordered query fails due to missing index, fall back to sorting the results manually

While this fallback works, it's less efficient than having the proper index in place.