import { initializeApp, getApps, getApp, type FirebaseApp } from "@firebase/app"
import { getFirestore, type Firestore } from "@firebase/firestore"
import { getAuth, type Auth } from "@firebase/auth"
import { getStorage, type FirebaseStorage } from "@firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyDNiHxkP4GUMjFiVh_fTRacKlOjJBrtmnU",
  authDomain: "topbrain-5f2e0.firebaseapp.com",
  projectId: "topbrain-5f2e0",
  storageBucket: "topbrain-5f2e0.firebasestorage.app",
  messagingSenderId: "771610974891",
  appId: "1:771610974891:web:e7f58c0fa255365222b5ee",
}

let firebaseApp: FirebaseApp | undefined
let firebaseDb: Firestore | undefined
let firebaseAuth: Auth | undefined
let firebaseStorage: FirebaseStorage | undefined
let initialized = false

function initializeFirebase() {
  if (initialized) return
  // if (typeof window === "undefined") return

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("[Firebase] Missing configuration. Check environment variables.")
    return
  }

  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    firebaseDb = getFirestore(firebaseApp)
    firebaseAuth = getAuth(firebaseApp)
    firebaseStorage = getStorage(firebaseApp)
    initialized = true
  } catch (error) {
    console.error("[Firebase] Initialization error:", error)
  }
}

// Initialize always
initializeFirebase()

export function getFirebaseApp(): FirebaseApp | undefined {
  if (!initialized) initializeFirebase()
  return firebaseApp
}

export function getDb(): Firestore | undefined {
  if (!initialized) initializeFirebase()
  return firebaseDb
}

export function getAuthInstance(): Auth | undefined {
  if (!initialized) initializeFirebase()
  return firebaseAuth
}

export function getStorageInstance(): FirebaseStorage | undefined {
  if (!initialized) initializeFirebase()
  return firebaseStorage
}

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!initialized) initializeFirebase()
    if (!firebaseDb) {
      throw new Error(
        "Firestore is not initialized. Make sure you're on the client side and environment variables are set.",
      )
    }
    return (firebaseDb as any)[prop]
  },
})

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!initialized) initializeFirebase()
    if (!firebaseAuth) {
      throw new Error("Auth is not initialized. Make sure you're on the client side and environment variables are set.")
    }
    return (firebaseAuth as any)[prop]
  },
})

export const app = getFirebaseApp

export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!initialized) initializeFirebase()
    if (!firebaseStorage) {
      throw new Error(
        "Storage is not initialized. Make sure you're on the client side and environment variables are set.",
      )
    }
    return (firebaseStorage as any)[prop]
  },
})
