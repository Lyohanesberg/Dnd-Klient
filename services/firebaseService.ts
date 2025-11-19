
import { db, auth } from '../firebaseConfig';
import { 
  collection, doc, setDoc, onSnapshot, updateDoc, 
  arrayUnion, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Message, CombatState, LocationState, MapToken, Quest, Note } from '../types';

export const SESSION_COLLECTION = 'sessions';

export interface GameSessionData {
  hostId: string;
  createdAt: any;
  location: LocationState;
  combatState: CombatState;
  mapTokens: MapToken[];
  quests: Quest[];
  notes: Note[];
  storySummary: string;
  messages: Message[]; // Checking array limit in prod is better, but simple for now
}

// Ensure user is signed in (anonymously) to access DB
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser?.uid;
};

export const createSession = async (initialState: Partial<GameSessionData>): Promise<string> => {
  const uid = await ensureAuth();
  const sessionId = Math.random().toString(36).substring(2, 9).toUpperCase();
  
  const sessionRef = doc(db, SESSION_COLLECTION, sessionId);
  
  await setDoc(sessionRef, {
    hostId: uid,
    createdAt: serverTimestamp(),
    messages: [],
    mapTokens: [],
    quests: [],
    notes: [],
    storySummary: "",
    combatState: { isActive: false, combatants: [] },
    location: { name: "Start", description: "", isGenerating: false },
    ...initialState
  });

  return sessionId;
};

export const joinSession = async (sessionId: string): Promise<boolean> => {
  await ensureAuth();
  const docRef = doc(db, SESSION_COLLECTION, sessionId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

export const subscribeToSession = (sessionId: string, callback: (data: GameSessionData) => void) => {
  const docRef = doc(db, SESSION_COLLECTION, sessionId);
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as GameSessionData);
    }
  });
};

export const sendMessageToSession = async (sessionId: string, message: Message) => {
  const docRef = doc(db, SESSION_COLLECTION, sessionId);
  await updateDoc(docRef, {
    messages: arrayUnion(message)
  });
};

export const updateSessionState = async (sessionId: string, updates: Partial<GameSessionData>) => {
  const docRef = doc(db, SESSION_COLLECTION, sessionId);
  await updateDoc(docRef, updates);
};
