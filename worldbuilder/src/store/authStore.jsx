// src/store/authStore.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
const DEFAULT_CAMPAIGN_ID = "zerinthra";

async function ensureDefaultCampaign() {
  const campaignRef = doc(db, "campaigns", DEFAULT_CAMPAIGN_ID);
  const campaignSnap = await getDoc(campaignRef);

  if (!campaignSnap.exists()) {
    await setDoc(campaignRef, {
      id: DEFAULT_CAMPAIGN_ID,
      name: "Zerinthra",
      description: "Main campaign",
      sessionDate: "2026-03-28T18:00:00",
      sharedLinks: [
        { label: "DnDBeyond Campaign", url: "#" },
        { label: "Character Sheets", url: "#" },
        { label: "Encounter Builder", url: "#" },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function createPersonalNotesEntry(firebaseUser, campaignId, preferredDisplayName = "") {
  const entryRef = doc(collection(db, "entries"));
  const resolvedDisplayName =
    preferredDisplayName.trim() ||
    firebaseUser.displayName ||
    "Adventurer";

  const entryData = {
    id: entryRef.id,
    title: `${resolvedDisplayName}'s Personal Notes`,
    type: "note",
    tags: ["note", "personal"],
    campaignId,
    visibility: "private",
    ownerUid: firebaseUser.uid,
    summary: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: firebaseUser.uid,
  };

  await setDoc(entryRef, entryData);
  return entryData.id;
}

async function ensureUserProfile(firebaseUser, preferredDisplayName = "") {
  await ensureDefaultCampaign();

  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  const resolvedDisplayName =
    preferredDisplayName.trim() ||
    firebaseUser.displayName ||
    "Adventurer";

  if (!userSnap.exists()) {
    const personalNotesEntryId = await createPersonalNotesEntry(
      firebaseUser,
      DEFAULT_CAMPAIGN_ID,
      resolvedDisplayName
    );

    const newProfile = {
      uid: firebaseUser.uid,
      displayName: resolvedDisplayName,
      role: "user",
      photoURL: "",
      campaignIds: [DEFAULT_CAMPAIGN_ID],
      activeCampaignId: DEFAULT_CAMPAIGN_ID,
      pinnedEntryIds: [],
      playerCharacterEntryIds: {},
      personalNotesEntryIds: {
        [DEFAULT_CAMPAIGN_ID]: personalNotesEntryId,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    return {
      ...newProfile,
      createdAt: null,
      updatedAt: null,
    };
  }

  const existingProfile = userSnap.data();
  const updates = {};

  if (!Array.isArray(existingProfile.campaignIds)) {
    updates.campaignIds = [DEFAULT_CAMPAIGN_ID];
  }

  if (!existingProfile.activeCampaignId) {
    updates.activeCampaignId = DEFAULT_CAMPAIGN_ID;
  }

  if (!Array.isArray(existingProfile.pinnedEntryIds)) {
    updates.pinnedEntryIds = [];
  }

  if (!existingProfile.playerCharacterEntryIds) {
    updates.playerCharacterEntryIds = {};
  }

  if (!existingProfile.personalNotesEntryIds) {
    updates.personalNotesEntryIds = {};
  }

  if (typeof existingProfile.photoURL !== "string") {
    updates.photoURL = "";
  }

  if (
    !existingProfile.displayName ||
    (existingProfile.displayName === "Adventurer" && resolvedDisplayName !== "Adventurer")
  ) {
    updates.displayName = resolvedDisplayName;
  }

  const notesMap = existingProfile.personalNotesEntryIds ?? {};
  if (!notesMap[DEFAULT_CAMPAIGN_ID]) {
    const personalNotesEntryId = await createPersonalNotesEntry(
      firebaseUser,
      DEFAULT_CAMPAIGN_ID,
      resolvedDisplayName
    );

    updates.personalNotesEntryIds = {
      ...notesMap,
      [DEFAULT_CAMPAIGN_ID]: personalNotesEntryId,
    };
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    await setDoc(userRef, updates, { merge: true });
  }

  return {
    ...existingProfile,
    ...updates,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allUserProfiles, setAllUserProfiles] = useState({});
  const [campaigns, setCampaigns] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(firebaseUser);
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to load or create user profile:", error);
        setUserProfile(null);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const next = {};

      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });

      setAllUserProfiles(next);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "campaigns"), (snapshot) => {
      const next = {};

      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });

      setCampaigns(next);
    });

    return () => unsubscribe();
  }, []);

const signup = async ({ email, password, displayName }) => {
  const trimmedDisplayName = displayName.trim();
  const result = await createUserWithEmailAndPassword(auth, email, password);

  if (trimmedDisplayName) {
    await updateProfile(result.user, {
      displayName: trimmedDisplayName,
    });
  }

  const profile = await ensureUserProfile(result.user, trimmedDisplayName);
  setUserProfile(profile);

  return result.user;
};

  const login = async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

const updateUserProfile = async (updates) => {
  if (!user) return;

  const nextProfile = {
    ...(userProfile ?? {}),
    ...updates,
  };

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (typeof updates.displayName === "string") {
    const trimmedDisplayName = updates.displayName.trim() || "Adventurer";
    const personalNotesEntryIds = nextProfile.personalNotesEntryIds ?? {};

    await Promise.all(
      Object.values(personalNotesEntryIds).map(async (notesEntryId) => {
        if (!notesEntryId) return;

        await updateDoc(doc(db, "entries", notesEntryId), {
          title: `${trimmedDisplayName}'s Personal Notes`,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      })
    );
  }

  setUserProfile(nextProfile);
};

  const setPlayerCharacterEntry = async (campaignId, entryId) => {
    if (!user) return;

    const nextMap = {
      ...(userProfile?.playerCharacterEntryIds ?? {}),
      [campaignId]: entryId,
    };

    await updateUserProfile({
      playerCharacterEntryIds: nextMap,
    });
  };

  const setPersonalNotesEntry = async (campaignId, entryId) => {
    if (!user) return;

    const nextMap = {
      ...(userProfile?.personalNotesEntryIds ?? {}),
      [campaignId]: entryId,
    };

    await updateUserProfile({
      personalNotesEntryIds: nextMap,
    });
  };

  const pinEntry = async (entryId) => {
    if (!user) return;

    const current = userProfile?.pinnedEntryIds ?? [];
    if (current.includes(entryId)) return;

    await updateUserProfile({
      pinnedEntryIds: [...current, entryId],
    });
  };

  const unpinEntry = async (entryId) => {
    if (!user) return;

    const current = userProfile?.pinnedEntryIds ?? [];

    await updateUserProfile({
      pinnedEntryIds: current.filter((id) => id !== entryId),
    });
  };

  const updateCampaign = async (campaignId, updates) => {
    const campaignRef = doc(db, "campaigns", campaignId);

    await updateDoc(campaignRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const isAdmin = userProfile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        allUserProfiles,
        campaigns,
        activeCampaign: campaigns[userProfile?.activeCampaignId ?? DEFAULT_CAMPAIGN_ID] ?? null,
        authLoading,
        signup,
        login,
        logout,
        isAdmin,
        activeCampaignId: userProfile?.activeCampaignId ?? DEFAULT_CAMPAIGN_ID,
        updateUserProfile,
        setPlayerCharacterEntry,
        setPersonalNotesEntry,
        pinEntry,
        unpinEntry,
        updateCampaign,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}