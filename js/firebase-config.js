/* ============================================
   AS WEDDING — Firebase Configuration
   ============================================ */

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Firebase will be initialized after SDK loads
let db = null;
let storage = null;

function initFirebase() {
    try {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Running in offline mode.');
            return false;
        }

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Initialize Firestore
        db = firebase.firestore();

        // Enable offline persistence
        db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open.');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not available in this browser.');
            }
        });

        // Initialize Storage
        storage = firebase.storage();

        console.log('Firebase initialized successfully.');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

/* ---- Guest Lookup ---- */
async function lookupGuest(phone) {
    if (!db) {
        console.warn('Firestore not available.');
        // Demo mode: return a fake guest for testing
        if (phone === '9999999999') {
            return { name: 'Demo Guest', nameHindi: 'डेमो अतिथि', phone: '9999999999', events: ['engagement', 'haldi', 'wedding'], canUpload: true };
        }
        return null;
    }

    try {
        const snapshot = await db.collection('guests')
            .where('phone', '==', phone)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Guest lookup error:', error);
        return null;
    }
}

/* ---- Log Guest Access ---- */
async function logGuestAccess(phone, name) {
    if (!db) return;

    try {
        await db.collection('accessLog').add({
            phone,
            name,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error('Access log error:', error);
    }
}

/* ---- Photo Operations ---- */
async function uploadPhoto(file, eventName, phone) {
    if (!storage || !db) {
        console.warn('Firebase not available for upload.');
        return null;
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `photos/${eventName}/${phone}/${timestamp}_${safeName}`;
    const storageRef = storage.ref(path);

    try {
        const uploadTask = await storageRef.put(file);
        const url = await uploadTask.ref.getDownloadURL();

        // Write metadata to Firestore
        await db.collection('photos').add({
            event: eventName,
            uploadedBy: sessionStorage.getItem('guest_name') || 'Unknown',
            phone,
            url,
            path,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            approved: true,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        return url;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

async function getPhotos(eventName) {
    if (!db) return [];

    try {
        const snapshot = await db.collection('photos')
            .where('event', '==', eventName)
            .where('approved', '==', true)
            .orderBy('timestamp', 'desc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Get photos error:', error);
        return [];
    }
}

async function checkUploadPermission(phone) {
    if (!db) {
        // Demo mode
        if (phone === '9999999999') return true;
        return false;
    }

    try {
        const snapshot = await db.collection('guests')
            .where('phone', '==', phone)
            .limit(1)
            .get();

        if (snapshot.empty) return false;
        return snapshot.docs[0].data().canUpload === true;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

/* ---- WhatsApp Submissions ---- */
async function createWhatsAppSubmission(data) {
    if (!db) {
        console.warn('Firestore not available.');
        return null;
    }

    try {
        const docRef = await db.collection('whatsapp_submissions').add({
            senderName: data.senderName || '',
            senderPhone: data.senderPhone || '',
            eventTag: data.eventTag || '',
            mediaUrls: data.mediaUrls || [],
            receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            reviewedAt: null,
            reviewedBy: null,
            note: null
        });
        return docRef.id;
    } catch (error) {
        console.error('Create WA submission error:', error);
        return null;
    }
}

async function getWhatsAppSubmissions(statusFilter, eventFilter) {
    if (!db) return [];

    try {
        let query = db.collection('whatsapp_submissions')
            .orderBy('receivedAt', 'desc');

        if (statusFilter && statusFilter !== 'all') {
            query = query.where('status', '==', statusFilter);
        }
        if (eventFilter && eventFilter !== 'all') {
            query = query.where('eventTag', '==', eventFilter);
        }

        const snapshot = await query.limit(200).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Get WA submissions error:', error);
        return [];
    }
}

async function updateSubmissionStatus(docId, status, reviewedBy) {
    if (!db) return false;

    try {
        await db.collection('whatsapp_submissions').doc(docId).update({
            status,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reviewedBy: reviewedBy || 'admin'
        });
        return true;
    } catch (error) {
        console.error('Update submission error:', error);
        return false;
    }
}

async function approveAndCopyToGallery(submission) {
    if (!db) return false;

    try {
        // Update submission status
        await updateSubmissionStatus(submission.id, 'approved', 'admin');

        // Copy each media URL to the photos collection
        const urls = submission.mediaUrls || [];
        for (const url of urls) {
            await db.collection('photos').add({
                event: submission.eventTag,
                uploadedBy: submission.senderName || 'WhatsApp Guest',
                phone: submission.senderPhone || '',
                url,
                source: 'whatsapp',
                approved: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                submissionId: submission.id,
                fileName: '',
                fileSize: 0,
                fileType: 'image/jpeg'
            });
        }
        return true;
    } catch (error) {
        console.error('Approve + copy error:', error);
        return false;
    }
}

async function bulkUploadToReviewQueue(files, senderName, senderPhone, eventTag) {
    if (!storage || !db) {
        console.warn('Firebase not available for bulk upload.');
        return null;
    }

    const mediaUrls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `whatsapp_submissions/${eventTag}/${senderPhone}/${timestamp}_${safeName}`;
        const storageRef = storage.ref(path);

        try {
            const uploadTask = await storageRef.put(file);
            const url = await uploadTask.ref.getDownloadURL();
            mediaUrls.push(url);
        } catch (err) {
            console.error(`Upload failed for ${file.name}:`, err);
        }
    }

    if (mediaUrls.length === 0) return null;

    return createWhatsAppSubmission({
        senderName,
        senderPhone,
        eventTag,
        mediaUrls
    });
}
