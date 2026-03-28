/* eslint-disable react-refresh/only-export-components */
// src/store/authStore.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);
const PUBLIC_SIGNUP_ENABLED = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP === "true";

function buildMembershipId(campaignId, userUid) {
  return `${campaignId}_${userUid}`;
}

function normalizeUserProfile(data, firebaseUser, preferredDisplayName = "") {
  const resolvedDisplayName =
    preferredDisplayName.trim() ||
    data?.displayName ||
    firebaseUser.displayName ||
    "Adventurer";

  return {
    uid: firebaseUser.uid,
    displayName: resolvedDisplayName,
    photoURL: typeof data?.photoURL === "string" ? data.photoURL : "",
    activeCampaignId:
      typeof data?.activeCampaignId === "string" && data.activeCampaignId.trim()
        ? data.activeCampaignId
        : null,
    pinnedEntryIds: Array.isArray(data?.pinnedEntryIds) ? data.pinnedEntryIds : [],
    playerCharacterEntryIds:
      data?.playerCharacterEntryIds && typeof data.playerCharacterEntryIds === "object"
        ? data.playerCharacterEntryIds
        : {},
    personalNotesEntryIds:
      data?.personalNotesEntryIds && typeof data.personalNotesEntryIds === "object"
        ? data.personalNotesEntryIds
        : {},
    role: typeof data?.role === "string" ? data.role : "user",
    campaignIds: Array.isArray(data?.campaignIds) ? data.campaignIds : [],
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
  };
}

function createJoinSalt() {
  const values = new Uint8Array(16);
  window.crypto.getRandomValues(values);

  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashCampaignPassword(password, salt) {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`${salt}:${password.trim()}`);
  const digest = await window.crypto.subtle.digest("SHA-256", payload);

  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
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
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newProfile = normalizeUserProfile(
      {
        uid: firebaseUser.uid,
        displayName: preferredDisplayName.trim() || firebaseUser.displayName || "Adventurer",
        photoURL: "",
        activeCampaignId: null,
        pinnedEntryIds: [],
        playerCharacterEntryIds: {},
        personalNotesEntryIds: {},
        role: "user",
        campaignIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      firebaseUser,
      preferredDisplayName
    );

    await setDoc(userRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newProfile;
  }

  const existingProfile = userSnap.data();
  const normalizedProfile = normalizeUserProfile(
    existingProfile,
    firebaseUser,
    preferredDisplayName
  );
  const updates = {};

  if (normalizedProfile.displayName !== existingProfile.displayName) {
    updates.displayName = normalizedProfile.displayName;
  }

  if (normalizedProfile.photoURL !== existingProfile.photoURL) {
    updates.photoURL = normalizedProfile.photoURL;
  }

  if (normalizedProfile.activeCampaignId !== existingProfile.activeCampaignId) {
    updates.activeCampaignId = normalizedProfile.activeCampaignId;
  }

  if (!Array.isArray(existingProfile.pinnedEntryIds)) {
    updates.pinnedEntryIds = normalizedProfile.pinnedEntryIds;
  }

  if (
    !existingProfile.playerCharacterEntryIds ||
    typeof existingProfile.playerCharacterEntryIds !== "object"
  ) {
    updates.playerCharacterEntryIds = normalizedProfile.playerCharacterEntryIds;
  }

  if (
    !existingProfile.personalNotesEntryIds ||
    typeof existingProfile.personalNotesEntryIds !== "object"
  ) {
    updates.personalNotesEntryIds = normalizedProfile.personalNotesEntryIds;
  }

  if (Object.keys(updates).length > 0) {
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return normalizedProfile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [campaignMemberships, setCampaignMemberships] = useState({});
  const [campaignMembers, setCampaignMembers] = useState({});
  const [campaigns, setCampaigns] = useState({});
  const migrationInFlightRef = useRef(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setCampaignMemberships({});
        setCampaignMembers({});
        setCampaigns({});
        setAuthLoading(false);
        setMembershipLoading(false);
        return;
      }

      setUser(firebaseUser);
      setAuthLoading(true);
      setMembershipLoading(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const userRef = doc(db, "users", user.uid);
    let unsubscribe = () => {};
    let cancelled = false;

    const start = async () => {
      try {
        await ensureUserProfile(user);

        unsubscribe = onSnapshot(
          userRef,
          (snapshot) => {
            if (cancelled) return;

            const nextProfile = normalizeUserProfile(snapshot.data(), user);
            setUserProfile(nextProfile);
            setAuthLoading(false);
          },
          (error) => {
            console.error("Failed to subscribe to the user profile:", error);
            setAuthLoading(false);
          }
        );
      } catch (error) {
        console.error("Failed to load or create user profile:", error);
        if (!cancelled) {
          setUserProfile(null);
          setAuthLoading(false);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCampaignMemberships({});
      setMembershipLoading(false);
      return undefined;
    }

    const membershipsQuery = query(
      collection(db, "campaignMembers"),
      where("userUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      membershipsQuery,
      (snapshot) => {
        const next = {};

        snapshot.forEach((docSnap) => {
          const membership = docSnap.data();
          next[membership.campaignId] = membership;
        });

        setCampaignMemberships(next);
        setMembershipLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to campaign memberships:", error);
        setCampaignMemberships({});
        setMembershipLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const campaignIds = useMemo(() => {
    return Object.keys(campaignMemberships).sort((a, b) => a.localeCompare(b));
  }, [campaignMemberships]);

  useEffect(() => {
    if (!user || campaignIds.length === 0) {
      setCampaigns({});
      return undefined;
    }

    const activeIdSet = new Set(campaignIds);
    const unsubscribers = campaignIds.map((campaignId) =>
      onSnapshot(
        doc(db, "campaigns", campaignId),
        (snapshot) => {
          setCampaigns((current) => {
            const next = Object.fromEntries(
              Object.entries(current).filter(([id]) => activeIdSet.has(id))
            );

            if (snapshot.exists()) {
              next[campaignId] = snapshot.data();
            } else {
              delete next[campaignId];
            }

            return next;
          });
        },
        (error) => {
          console.error(`Failed to subscribe to campaign ${campaignId}:`, error);
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      setCampaigns({});
    };
  }, [user, campaignIds]);

  const activeCampaignId = userProfile?.activeCampaignId ?? null;

  useEffect(() => {
    if (!user || !activeCampaignId) {
      setCampaignMembers({});
      return undefined;
    }

    const membersQuery = query(
      collection(db, "campaignMembers"),
      where("campaignId", "==", activeCampaignId)
    );

    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        const next = {};

        snapshot.forEach((docSnap) => {
          const membership = docSnap.data();
          next[membership.userUid] = membership;
        });

        setCampaignMembers(next);
      },
      (error) => {
        console.error("Failed to subscribe to campaign members:", error);
        setCampaignMembers({});
      }
    );

    return () => unsubscribe();
  }, [user, activeCampaignId]);

  useEffect(() => {
    if (!user || !userProfile) {
      return;
    }

    const legacyCampaignIds = Array.from(
      new Set(
        [...(userProfile.campaignIds ?? []), userProfile.activeCampaignId]
          .filter(Boolean)
          .map((campaignId) => String(campaignId))
      )
    );

    legacyCampaignIds.forEach((campaignId) => {
      if (campaignMemberships[campaignId]) {
        return;
      }

      if (migrationInFlightRef.current.has(campaignId)) {
        return;
      }

      migrationInFlightRef.current.add(campaignId);

      void (async () => {
        try {
          const campaignRef = doc(db, "campaigns", campaignId);
          const campaignSnap = await getDoc(campaignRef);

          if (!campaignSnap.exists()) {
            return;
          }

          const campaign = campaignSnap.data();
          const shouldOwnCampaign =
            campaign.ownerUid === user.uid ||
            (!campaign.ownerUid && userProfile.role === "admin");

          if (!campaign.ownerUid && shouldOwnCampaign) {
            await updateDoc(campaignRef, {
              ownerUid: user.uid,
              updatedAt: serverTimestamp(),
            });
          }

          const memberRef = doc(db, "campaignMembers", buildMembershipId(campaignId, user.uid));
          const memberSnap = await getDoc(memberRef);

          if (!memberSnap.exists()) {
            await setDoc(memberRef, {
              id: memberRef.id,
              campaignId,
              userUid: user.uid,
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
              canWrite: true,
              isOwner: shouldOwnCampaign,
              playerCharacterEntryId:
                userProfile.playerCharacterEntryIds?.[campaignId] ?? null,
              joinProof: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const hasNotes = Boolean(userProfile.personalNotesEntryIds?.[campaignId]);
          if (!hasNotes) {
            const notesEntryId = await createPersonalNotesEntry(
              user,
              campaignId,
              userProfile.displayName
            );

            await setDoc(
              doc(db, "users", user.uid),
              {
                personalNotesEntryIds: {
                  ...(userProfile.personalNotesEntryIds ?? {}),
                  [campaignId]: notesEntryId,
                },
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (error) {
          console.error(`Failed to migrate campaign membership for ${campaignId}:`, error);
        } finally {
          migrationInFlightRef.current.delete(campaignId);
        }
      })();
    });
  }, [user, userProfile, campaignMemberships]);

  useEffect(() => {
    if (!user || !userProfile || membershipLoading) {
      return;
    }

    const currentActiveCampaignId = userProfile.activeCampaignId;

    if (!currentActiveCampaignId) {
      return;
    }

    if (campaignMemberships[currentActiveCampaignId]) {
      return;
    }

    void setDoc(
      doc(db, "users", user.uid),
      {
        activeCampaignId: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user, userProfile, campaignMemberships, membershipLoading]);

  const ensureCampaignNotes = async (campaignId, profileOverride = null) => {
    if (!user) {
      return null;
    }

    const profile = profileOverride ?? userProfile ?? (await ensureUserProfile(user));

    if (profile.personalNotesEntryIds?.[campaignId]) {
      return profile.personalNotesEntryIds[campaignId];
    }

    const personalNotesEntryId = await createPersonalNotesEntry(
      user,
      campaignId,
      profile.displayName
    );

    await setDoc(
      doc(db, "users", user.uid),
      {
        personalNotesEntryIds: {
          ...(profile.personalNotesEntryIds ?? {}),
          [campaignId]: personalNotesEntryId,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return personalNotesEntryId;
  };

  const signup = async ({ email, password, displayName }) => {
    if (!PUBLIC_SIGNUP_ENABLED) {
      const error = new Error("Public signup is disabled.");
      error.code = "auth/public-signup-disabled";
      throw error;
    }

    const trimmedDisplayName = displayName.trim();
    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (trimmedDisplayName) {
      await updateProfile(result.user, {
        displayName: trimmedDisplayName,
      });
    }

    await ensureUserProfile(result.user, trimmedDisplayName);
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

    await setDoc(
      doc(db, "users", user.uid),
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const shouldSyncIdentity =
      typeof updates.displayName === "string" || typeof updates.photoURL === "string";

    if (shouldSyncIdentity) {
      const displayName = nextProfile.displayName?.trim() || "Adventurer";
      const photoURL = nextProfile.photoURL?.trim() || "";

      await Promise.all(
        Object.values(campaignMemberships).map((membership) =>
          setDoc(
            doc(db, "campaignMembers", membership.id),
            {
              displayName,
              photoURL,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );
    }

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
  };

  const setActiveCampaign = async (campaignId) => {
    if (!user) return;

    const nextCampaignId = campaignId || null;

    await setDoc(
      doc(db, "users", user.uid),
      {
        activeCampaignId: nextCampaignId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const createCampaign = async ({ name, joinPassword }) => {
    if (!user) return null;

    const trimmedName = name.trim();
    const trimmedPassword = joinPassword.trim();

    if (!trimmedName) {
      const error = new Error("Campaign name is required.");
      error.code = "campaign/name-required";
      throw error;
    }

    if (trimmedPassword.length < 6) {
      const error = new Error("Campaign password must be at least 6 characters.");
      error.code = "campaign/password-too-short";
      throw error;
    }

    const profile = userProfile ?? (await ensureUserProfile(user));
    const joinSalt = createJoinSalt();
    const joinPasswordHash = await hashCampaignPassword(trimmedPassword, joinSalt);
    const campaignRef = doc(collection(db, "campaigns"));

    await setDoc(campaignRef, {
      id: campaignRef.id,
      name: trimmedName,
      description: "",
      ownerUid: user.uid,
      sessionDate: null,
      sharedLinks: [],
      joinSalt,
      joinPasswordHash,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const membershipRef = doc(db, "campaignMembers", buildMembershipId(campaignRef.id, user.uid));

    await setDoc(membershipRef, {
      id: membershipRef.id,
      campaignId: campaignRef.id,
      userUid: user.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      canWrite: true,
      isOwner: true,
      playerCharacterEntryId: profile.playerCharacterEntryIds?.[campaignRef.id] ?? null,
      joinProof: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await ensureCampaignNotes(campaignRef.id, profile);
    await setActiveCampaign(campaignRef.id);

    return campaignRef.id;
  };

  const joinCampaign = async ({ campaignId, joinPassword }) => {
    if (!user) return null;

    const trimmedCampaignId = campaignId.trim();
    const trimmedPassword = joinPassword.trim();

    if (!trimmedCampaignId) {
      const error = new Error("Campaign ID is required.");
      error.code = "campaign/id-required";
      throw error;
    }

    if (!trimmedPassword) {
      const error = new Error("Campaign password is required.");
      error.code = "campaign/password-required";
      throw error;
    }

    if (campaignMemberships[trimmedCampaignId]) {
      await setActiveCampaign(trimmedCampaignId);
      return trimmedCampaignId;
    }

    const campaignRef = doc(db, "campaigns", trimmedCampaignId);
    const campaignSnap = await getDoc(campaignRef);

    if (!campaignSnap.exists()) {
      const error = new Error("Campaign not found.");
      error.code = "campaign/not-found";
      throw error;
    }

    const campaign = campaignSnap.data();
    const hashedPassword = await hashCampaignPassword(
      trimmedPassword,
      campaign.joinSalt ?? ""
    );

    if (!campaign.joinPasswordHash || hashedPassword !== campaign.joinPasswordHash) {
      const error = new Error("Campaign password is incorrect.");
      error.code = "campaign/invalid-password";
      throw error;
    }

    const profile = userProfile ?? (await ensureUserProfile(user));
    const membershipRef = doc(
      db,
      "campaignMembers",
      buildMembershipId(trimmedCampaignId, user.uid)
    );

    await setDoc(membershipRef, {
      id: membershipRef.id,
      campaignId: trimmedCampaignId,
      userUid: user.uid,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
      canWrite: false,
      isOwner: false,
      playerCharacterEntryId: profile.playerCharacterEntryIds?.[trimmedCampaignId] ?? null,
      joinProof: hashedPassword,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(membershipRef, {
      joinProof: null,
      updatedAt: serverTimestamp(),
    });

    await ensureCampaignNotes(trimmedCampaignId, profile);
    await setActiveCampaign(trimmedCampaignId);

    return trimmedCampaignId;
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

    const membershipId = buildMembershipId(campaignId, user.uid);

    await setDoc(
      doc(db, "campaignMembers", membershipId),
      {
        playerCharacterEntryId: entryId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
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
    const nextUpdates = { ...updates };

    if (typeof nextUpdates.joinPassword === "string") {
      const trimmedJoinPassword = nextUpdates.joinPassword.trim();

      if (trimmedJoinPassword) {
        if (trimmedJoinPassword.length < 6) {
          const error = new Error("Campaign password must be at least 6 characters.");
          error.code = "campaign/password-too-short";
          throw error;
        }

        const joinSalt = createJoinSalt();
        nextUpdates.joinSalt = joinSalt;
        nextUpdates.joinPasswordHash = await hashCampaignPassword(
          trimmedJoinPassword,
          joinSalt
        );
      }

      delete nextUpdates.joinPassword;
    }

    await updateDoc(doc(db, "campaigns", campaignId), {
      ...nextUpdates,
      updatedAt: serverTimestamp(),
    });
  };

  const updateCampaignMember = async (campaignId, userUid, updates) => {
    const membershipRef = doc(db, "campaignMembers", buildMembershipId(campaignId, userUid));

    await updateDoc(membershipRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const activeCampaign = activeCampaignId ? campaigns[activeCampaignId] ?? null : null;
  const isCampaignOwner = Boolean(activeCampaign?.ownerUid && activeCampaign.ownerUid === user?.uid);
  const canWriteActiveCampaign =
    isCampaignOwner || campaignMemberships[activeCampaignId]?.canWrite === true;
  const visibleCampaigns = useMemo(() => {
    return Object.values(campaigns).sort((a, b) => {
      const aName = (a?.name || "").toLowerCase();
      const bName = (b?.name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [campaigns]);

  const value = {
    user,
    userProfile,
    allUserProfiles: campaignMembers,
    campaignMemberships,
    campaignMembers,
    campaigns,
    visibleCampaigns,
    activeCampaign,
    authLoading: authLoading || membershipLoading,
    publicSignupEnabled: PUBLIC_SIGNUP_ENABLED,
    signup,
    login,
    logout,
    isAdmin: isCampaignOwner,
    isCampaignOwner,
    canWriteActiveCampaign,
    activeCampaignId,
    updateUserProfile,
    setActiveCampaign,
    createCampaign,
    joinCampaign,
    setPlayerCharacterEntry,
    setPersonalNotesEntry,
    pinEntry,
    unpinEntry,
    updateCampaign,
    updateCampaignMember,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
