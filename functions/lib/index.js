"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOrphanedData = exports.deleteFarmerAccount = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
/**
 * Cloud Function to delete a farmer account
 * Deletes both Firestore data AND Firebase Authentication account
 *
 * Only callable by admin users (admin@majayjay.farm)
 */
exports.deleteFarmerAccount = functions.https.onCall(async (data, context) => {
    // 1. Verify user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to delete accounts');
    }
    // 2. Verify user is admin
    const userEmail = context.auth.token.email;
    if (userEmail !== 'admin@majayjay.farm') {
        throw new functions.https.HttpsError('permission-denied', 'Only admin users can delete farmer accounts');
    }
    // 3. Validate input
    const { farmerId } = data;
    if (!farmerId || typeof farmerId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'farmerId is required and must be a string');
    }
    try {
        const db = admin.firestore();
        // Start a batch write for atomic Firestore operations
        const batch = db.batch();
        // Count how many items will be deleted for logging
        let deletedCrops = 0;
        let deletedReports = 0;
        // 4. Delete farmer profile document
        const farmerRef = db.collection('farmers').doc(farmerId);
        // Verify farmer exists
        const farmerDoc = await farmerRef.get();
        if (!farmerDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Farmer with ID ${farmerId} not found`);
        }
        const farmerData = farmerDoc.data();
        batch.delete(farmerRef);
        functions.logger.info(`Deleting farmer: ${farmerData === null || farmerData === void 0 ? void 0 : farmerData.fullName} (${farmerData === null || farmerData === void 0 ? void 0 : farmerData.email})`);
        // 5. Delete all farmer's crops
        const cropsSnapshot = await db
            .collection('farmerCrops')
            .where('userId', '==', farmerId)
            .get();
        cropsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCrops++;
        });
        functions.logger.info(`Found ${deletedCrops} crops to delete`);
        // 6. Delete all farmer's farm reports
        const reportsSnapshot = await db
            .collection('farmReports')
            .where('userId', '==', farmerId)
            .get();
        reportsSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedReports++;
        });
        functions.logger.info(`Found ${deletedReports} reports to delete`);
        // 7. Commit all Firestore deletions atomically
        await batch.commit();
        functions.logger.info('Firestore data deleted successfully');
        // 8. Delete Firebase Authentication user
        try {
            await admin.auth().deleteUser(farmerId);
            functions.logger.info(`Firebase Auth user deleted: ${farmerId}`);
        }
        catch (authError) {
            // Log but don't fail if Auth user doesn't exist or already deleted
            if (authError.code === 'auth/user-not-found') {
                functions.logger.warn(`Auth user ${farmerId} not found (already deleted or never existed)`);
            }
            else {
                throw authError;
            }
        }
        // 9. Return success response
        return {
            success: true,
            message: `Farmer account deleted successfully`,
            deleted: {
                farmer: farmerData === null || farmerData === void 0 ? void 0 : farmerData.fullName,
                email: farmerData === null || farmerData === void 0 ? void 0 : farmerData.email,
                crops: deletedCrops,
                reports: deletedReports,
                authUser: true
            }
        };
    }
    catch (error) {
        functions.logger.error('Error deleting farmer account:', error);
        // If it's already an HttpsError, re-throw it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Otherwise, wrap in internal error
        throw new functions.https.HttpsError('internal', 'Failed to delete farmer account', error.message);
    }
});
/**
 * Optional: Background function to clean up orphaned data
 * Runs daily to check for any inconsistencies
 */
exports.cleanupOrphanedData = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    const db = admin.firestore();
    try {
        // Get all farmers
        const farmersSnapshot = await db.collection('farmers').get();
        const farmerIds = new Set(farmersSnapshot.docs.map(doc => doc.id));
        let orphanedCrops = 0;
        let orphanedReports = 0;
        // Check for orphaned crops
        const cropsSnapshot = await db.collection('farmerCrops').get();
        const batch1 = db.batch();
        cropsSnapshot.forEach(doc => {
            const userId = doc.data().userId;
            if (!farmerIds.has(userId)) {
                batch1.delete(doc.ref);
                orphanedCrops++;
            }
        });
        if (orphanedCrops > 0) {
            await batch1.commit();
        }
        // Check for orphaned reports
        const reportsSnapshot = await db.collection('farmReports').get();
        const batch2 = db.batch();
        reportsSnapshot.forEach(doc => {
            const userId = doc.data().userId;
            if (!farmerIds.has(userId)) {
                batch2.delete(doc.ref);
                orphanedReports++;
            }
        });
        if (orphanedReports > 0) {
            await batch2.commit();
        }
        functions.logger.info(`Cleanup complete: ${orphanedCrops} crops, ${orphanedReports} reports removed`);
        return {
            orphanedCrops,
            orphanedReports
        };
    }
    catch (error) {
        functions.logger.error('Error during cleanup:', error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map