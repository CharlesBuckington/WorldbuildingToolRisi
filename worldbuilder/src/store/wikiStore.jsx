// src/store/wikiStore.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "./authStore.jsx";

const WikiContext = createContext(null);

export function WikiProvider({ children }) {
  const { isAdmin, user, activeCampaignId } = useAuth();
  const [entries, setEntries] = useState({});
  const [blocks, setBlocks] = useState({});
  const [markers, setMarkers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubEntries = onSnapshot(collection(db, "entries"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setEntries(next);
    });

    const unsubBlocks = onSnapshot(collection(db, "blocks"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setBlocks(next);
    });

    const unsubMarkers = onSnapshot(collection(db, "markers"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setMarkers(next);
      setLoading(false);
    });

    return () => {
      unsubEntries();
      unsubBlocks();
      unsubMarkers();
    };
  }, []);

  const createDocWithId = async (collectionName, data) => {
    const colRef = collection(db, collectionName);
    const docRef = doc(colRef);
    const fullData = {
      id: docRef.id,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, fullData);
    return fullData;
  };

  // Entries ---------------------------------------------------
  const createEntry = async (partial = {}) => {
    return createDocWithId("entries", {
      title: partial.title ?? "New Entry",
      type: partial.type ?? "location",
      summary: partial.summary ?? "",
      tags: partial.tags ?? [],
      campaignId: partial.campaignId ?? activeCampaignId,
      visibility: partial.visibility ?? "public",
      ownerUid: partial.ownerUid ?? null,
      updatedBy: user?.uid ?? null,
    });
  };

  const updateEntry = async (entryId, updates) => {
    await updateDoc(doc(db, "entries", entryId), {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid ?? null,
    });
  };

  const deleteEntry = async (entryId) => {
    const batch = writeBatch(db);

    const entryBlocks = Object.values(blocks).filter((b) => b.entryId === entryId);
    const entryBlockIds = new Set(entryBlocks.map((b) => b.id));

    const relatedMarkers = Object.values(markers).filter(
      (m) => m.entryId === entryId || entryBlockIds.has(m.blockId)
    );

    batch.delete(doc(db, "entries", entryId));

    entryBlocks.forEach((block) => {
      batch.delete(doc(db, "blocks", block.id));
    });

    relatedMarkers.forEach((marker) => {
      batch.delete(doc(db, "markers", marker.id));
    });

    await batch.commit();
  };

  // Blocks ----------------------------------------------------
  const createBlock = async (partial) => {
    return createDocWithId("blocks", {
      entryId: partial.entryId,
      type: partial.type,
      order: partial.order ?? 0,
      text: partial.text ?? "",
      imageFilename: partial.imageFilename ?? "",
      width: partial.width ?? null,
      height: partial.height ?? null,
      caption: partial.caption ?? "",
    });
  };

  const updateBlock = async (blockId, updates) => {
    await updateDoc(doc(db, "blocks", blockId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteBlock = async (blockId) => {
    const batch = writeBatch(db);

    batch.delete(doc(db, "blocks", blockId));

    Object.values(markers)
      .filter((m) => m.blockId === blockId)
      .forEach((marker) => {
        batch.delete(doc(db, "markers", marker.id));
      });

    await batch.commit();
  };

  // Markers ---------------------------------------------------
  const createMarker = async (partial) => {
    return createDocWithId("markers", {
      blockId: partial.blockId,
      entryId: partial.entryId ?? null,
      x: partial.x,
      y: partial.y,
      label: partial.label ?? "New Marker",
      iconKey: partial.iconKey ?? "default",
    });
  };

  const updateMarker = async (markerId, updates) => {
    await updateDoc(doc(db, "markers", markerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteMarker = async (markerId) => {
    await deleteDoc(doc(db, "markers", markerId));
  };

  const moveBlock = async (entryId, blockId, direction) => {
    const entryBlocks = Object.values(blocks)
      .filter((block) => block.entryId === entryId)
      .sort((a, b) => a.order - b.order);

    const currentIndex = entryBlocks.findIndex((block) => block.id === blockId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= entryBlocks.length) return;

    const currentBlock = entryBlocks[currentIndex];
    const targetBlock = entryBlocks[targetIndex];

    await Promise.all([
      updateDoc(doc(db, "blocks", currentBlock.id), {
        order: targetBlock.order,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, "blocks", targetBlock.id), {
        order: currentBlock.order,
        updatedAt: serverTimestamp(),
      }),
    ]);
  };

  const visibleEntries = useMemo(() => {
    return Object.fromEntries(
      Object.entries(entries).filter(([, entry]) => {
        if (isAdmin) {
          return true;
        }

        if ((entry.campaignId ?? activeCampaignId) !== activeCampaignId) {
          return false;
        }

        const visibility = entry.visibility ?? "public";

        if (visibility === "public") {
          return true;
        }

        if (visibility === "private") {
          return entry.ownerUid === user?.uid;
        }

        return false;
      })
    );
  }, [entries, isAdmin, activeCampaignId, user]);

  const visibleMarkers = useMemo(() => {
    return Object.fromEntries(
      Object.entries(markers).filter(([, marker]) => {
        if (isAdmin) return true;

        if (!marker.entryId) {
          return true;
        }

        const linkedEntry = entries[marker.entryId];

        if (!linkedEntry) {
          return false;
        }

        if ((linkedEntry.campaignId ?? activeCampaignId) !== activeCampaignId) {
          return false;
        }

        const visibility = linkedEntry.visibility ?? "public";

        if (visibility === "public") {
          return true;
        }

        if (visibility === "private") {
          return linkedEntry.ownerUid === user?.uid;
        }

        return false;
      })
    );
  }, [markers, entries, isAdmin, activeCampaignId, user]);

  const value = useMemo(
    () => ({
      entries: visibleEntries,
      blocks,
      markers: visibleMarkers,
      loading,
      createEntry,
      updateEntry,
      deleteEntry,
      createBlock,
      updateBlock,
      deleteBlock,
      createMarker,
      updateMarker,
      deleteMarker,
      moveBlock
    }),
    [visibleEntries, blocks, visibleMarkers, loading]
  );


  
  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>;
}

export function useWiki() {
  const ctx = useContext(WikiContext);
  if (!ctx) {
    throw new Error("useWiki must be used within a WikiProvider");
  }
  return ctx;
}