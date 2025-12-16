import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    where,
    Timestamp,
    getFirestore
} from "firebase/firestore"
import { getDb, getFirebaseApp } from "@/lib/firebase"
import type { BlogPost } from "./types"

const COLLECTION_NAME = "blog_posts"

function getSafeDb() {
    const db = getDb()
    if (!db) {
        // Fallback initialization if getDb returns undefined (shouldn't happen with proxy logic, but safer here)
        const app = getFirebaseApp();
        if (app) return getFirestore(app);
        throw new Error("Firestore not initialized");
    }
    return db;
}

// Get all published blog posts (for users)
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
    const db = getSafeDb();
    const q = query(
        collection(db, COLLECTION_NAME),
        where("isPublished", "==", true),
        orderBy("createdAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
        doc_id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
    })) as BlogPost[]
}

// Get all blog posts (for admin)
export async function getAllBlogPosts(): Promise<BlogPost[]> {
    const db = getSafeDb();
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
        doc_id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
    })) as BlogPost[]
}

// Get single blog post by ID
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
    const db = getSafeDb();
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) return null

    return {
        doc_id: docSnap.id,
        ...docSnap.data(),
        createdAt: (docSnap.data().createdAt as Timestamp).toDate(),
    } as BlogPost
}

// Create new blog post
export async function createBlogPost(post: Omit<BlogPost, "doc_id" | "createdAt" | "author" | "isPublished">): Promise<string> {
    // Explicitly get app and firestore to prevent initialization issues
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase App is not initialized");
    const db = getFirestore(app);

    const newPost = {
        ...post,
        author: "TopBrain AI",
        isPublished: true,
        createdAt: serverTimestamp(),
    }

    // Use the explicitly initialized 'db' here
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newPost)
    return docRef.id
}

// Delete blog post
export async function deleteBlogPost(id: string): Promise<void> {
    const db = getSafeDb();
    await deleteDoc(doc(db, COLLECTION_NAME, id))
}
