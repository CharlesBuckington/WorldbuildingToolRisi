/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
// src/store/wikiStore.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "./authStore.jsx";

const WikiContext = createContext(null);
const MAX_IN_QUERY_VALUES = 30;

function chunkArray(items, size = MAX_IN_QUERY_VALUES) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function mergeChunkMaps(chunkMap) {
  return Object.values(chunkMap).reduce((merged, currentChunk) => {
    return {
      ...merged,
      ...currentChunk,
    };
  }, {});
}

function getEntryVisibility(entry) {
  return entry?.visibility ?? "public";
}

export function WikiProvider({ children }) {
  const { user, activeCampaignId, isCampaignOwner, canWriteActiveCampaign } = useAuth();
  const [entries, setEntries] = useState({});
  const [blocks, setBlocks] = useState({});
  const [markers, setMarkers] = useState({});
  const [loading, setLoading] = useState(false);

  const canEditEntry = (entryOrId) => {
    const entry = typeof entryOrId === "string" ? entries[entryOrId] : entryOrId;

    if (!entry || !user) {
      return false;
    }

    if (entry.campaignId !== activeCampaignId) {
      return false;
    }

    if (isCampaignOwner) {
      return true;
    }

    const visibility = getEntryVisibility(entry);

    if (visibility === "admin") {
      return false;
    }

    if (visibility === "private") {
      return entry.ownerUid === user.uid;
    }

    return canWriteActiveCampaign;
  };

  useEffect(() => {
    if (!user || !activeCampaignId) {
      setEntries({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const entrySlices = {
      public: {},
      private: {},
      admin: {},
    };

    const status = {
      public: false,
      private: false,
      admin: !isCampaignOwner,
    };

    const updateEntries = () => {
      setEntries({
        ...entrySlices.public,
        ...entrySlices.private,
        ...entrySlices.admin,
      });

      if (status.public && status.private && status.admin) {
        setLoading(false);
      }
    };

    const handleSnapshot = (key) => (snapshot) => {
      const next = {};

      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });

      entrySlices[key] = next;
      status[key] = true;
      updateEntries();
    };

    const handleError = (key) => (error) => {
      console.error(`Failed to subscribe to ${key} entries:`, error);
      entrySlices[key] = {};
      status[key] = true;
      updateEntries();
    };

    const unsubscribers = [
      onSnapshot(
        query(
          collection(db, "entries"),
          where("campaignId", "==", activeCampaignId),
          where("visibility", "==", "public")
        ),
        handleSnapshot("public"),
        handleError("public")
      ),
      onSnapshot(
        query(
          collection(db, "entries"),
          where("campaignId", "==", activeCampaignId),
          where("visibility", "==", "private"),
          where("ownerUid", "==", user.uid)
        ),
        handleSnapshot("private"),
        handleError("private")
      ),
    ];

    if (isCampaignOwner) {
      unsubscribers.push(
        onSnapshot(
          query(
            collection(db, "entries"),
            where("campaignId", "==", activeCampaignId),
            where("visibility", "==", "admin")
          ),
          handleSnapshot("admin"),
          handleError("admin")
        )
      );
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      setEntries({});
      setLoading(false);
    };
  }, [user, activeCampaignId, isCampaignOwner]);

  const visibleEntryIds = useMemo(() => {
    return Object.keys(entries).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  useEffect(() => {
    if (!user || !activeCampaignId || visibleEntryIds.length === 0) {
      setBlocks({});
      return undefined;
    }

    const blockChunks = {};
    const unsubscribers = chunkArray(visibleEntryIds).map((entryIdChunk, chunkIndex) =>
      onSnapshot(
        query(collection(db, "blocks"), where("entryId", "in", entryIdChunk)),
        (snapshot) => {
          const nextChunk = {};

          snapshot.forEach((docSnap) => {
            nextChunk[docSnap.id] = docSnap.data();
          });

          blockChunks[chunkIndex] = nextChunk;
          setBlocks(mergeChunkMaps(blockChunks));
        },
        (error) => {
          console.error("Failed to subscribe to blocks:", error);
          blockChunks[chunkIndex] = {};
          setBlocks(mergeChunkMaps(blockChunks));
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      setBlocks({});
    };
  }, [user, activeCampaignId, visibleEntryIds]);

  const visibleBlockIds = useMemo(() => {
    return Object.keys(blocks).sort((a, b) => a.localeCompare(b));
  }, [blocks]);

  useEffect(() => {
    if (!user || !activeCampaignId) {
      setMarkers({});
      return undefined;
    }

    const entryMarkerChunks = {};
    const blockMarkerChunks = {};
    const unsubscribers = [];

    const updateMarkers = () => {
      setMarkers({
        ...mergeChunkMaps(entryMarkerChunks),
        ...mergeChunkMaps(blockMarkerChunks),
      });
    };

    chunkArray(visibleEntryIds).forEach((entryIdChunk, chunkIndex) => {
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "markers"), where("entryId", "in", entryIdChunk)),
          (snapshot) => {
            const nextChunk = {};

            snapshot.forEach((docSnap) => {
              nextChunk[docSnap.id] = docSnap.data();
            });

            entryMarkerChunks[chunkIndex] = nextChunk;
            updateMarkers();
          },
          (error) => {
            console.error("Failed to subscribe to entry markers:", error);
            entryMarkerChunks[chunkIndex] = {};
            updateMarkers();
          }
        )
      );
    });

    chunkArray(visibleBlockIds).forEach((blockIdChunk, chunkIndex) => {
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "markers"), where("blockId", "in", blockIdChunk)),
          (snapshot) => {
            const nextChunk = {};

            snapshot.forEach((docSnap) => {
              nextChunk[docSnap.id] = docSnap.data();
            });

            blockMarkerChunks[chunkIndex] = nextChunk;
            updateMarkers();
          },
          (error) => {
            console.error("Failed to subscribe to block markers:", error);
            blockMarkerChunks[chunkIndex] = {};
            updateMarkers();
          }
        )
      );
    });

    if (unsubscribers.length === 0) {
      setMarkers({});
      return undefined;
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      setMarkers({});
    };
  }, [user, activeCampaignId, visibleEntryIds, visibleBlockIds]);

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

  const createEntry = async (partial = {}) => {
    if (!user || !activeCampaignId) {
      throw new Error("No active campaign selected.");
    }

    if (!canWriteActiveCampaign) {
      throw new Error("You do not have write access to this campaign.");
    }

    return createDocWithId("entries", {
      title: partial.title ?? "New Entry",
      type: partial.type ?? "location",
      summary: partial.summary ?? "",
      tags: partial.tags ?? [],
      campaignId: partial.campaignId ?? activeCampaignId,
      visibility: partial.visibility ?? "public",
      ownerUid: partial.ownerUid ?? user.uid,
      updatedBy: user.uid,
    });
  };

  const updateEntry = async (entryId, updates) => {
    const entry = entries[entryId];

    if (!canEditEntry(entry)) {
      throw new Error("You do not have permission to edit this entry.");
    }

    if (
      updates.visibility === "admin" &&
      !isCampaignOwner
    ) {
      throw new Error("Only the campaign owner can create admin-only entries.");
    }

    await updateDoc(doc(db, "entries", entryId), {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid ?? null,
    });
  };

  const deleteEntry = async (entryId) => {
    const entry = entries[entryId];

    if (!canEditEntry(entry)) {
      throw new Error("You do not have permission to delete this entry.");
    }

    const batch = writeBatch(db);
    const entryBlocks = Object.values(blocks).filter((block) => block.entryId === entryId);
    const entryBlockIds = new Set(entryBlocks.map((block) => block.id));

    const relatedMarkers = Object.values(markers).filter(
      (marker) => marker.entryId === entryId || entryBlockIds.has(marker.blockId)
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

  const createBlock = async (partial) => {
    if (!canEditEntry(partial.entryId)) {
      throw new Error("You do not have permission to edit this entry.");
    }

    return createDocWithId("blocks", {
      entryId: partial.entryId,
      type: partial.type,
      order: partial.order ?? 0,
      text: partial.text ?? "",
      imageFilename: partial.imageFilename ?? "",
      width: partial.width ?? null,
      height: partial.height ?? null,
      caption: partial.caption ?? "",
      fields: partial.fields ?? null,
    });
  };

  const updateBlock = async (blockId, updates) => {
    const block = blocks[blockId];

    if (!block || !canEditEntry(block.entryId)) {
      throw new Error("You do not have permission to edit this block.");
    }

    await updateDoc(doc(db, "blocks", blockId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteBlock = async (blockId) => {
    const block = blocks[blockId];

    if (!block || !canEditEntry(block.entryId)) {
      throw new Error("You do not have permission to delete this block.");
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, "blocks", blockId));

    Object.values(markers)
      .filter((marker) => marker.blockId === blockId)
      .forEach((marker) => {
        batch.delete(doc(db, "markers", marker.id));
      });

    await batch.commit();
  };

  const createMarker = async (partial) => {
    const targetEntryId = partial.entryId ?? blocks[partial.blockId]?.entryId ?? null;

    if (!targetEntryId || !canEditEntry(targetEntryId)) {
      throw new Error("You do not have permission to edit this marker.");
    }

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
    const marker = markers[markerId];
    const targetEntryId =
      updates.entryId ?? marker?.entryId ?? blocks[marker?.blockId]?.entryId ?? null;

    if (!marker || !targetEntryId || !canEditEntry(targetEntryId)) {
      throw new Error("You do not have permission to edit this marker.");
    }

    await updateDoc(doc(db, "markers", markerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteMarker = async (markerId) => {
    const marker = markers[markerId];
    const targetEntryId = marker?.entryId ?? blocks[marker?.blockId]?.entryId ?? null;

    if (!marker || !targetEntryId || !canEditEntry(targetEntryId)) {
      throw new Error("You do not have permission to delete this marker.");
    }

    await deleteDoc(doc(db, "markers", markerId));
  };

  const moveBlock = async (entryId, blockId, direction) => {
    if (!canEditEntry(entryId)) {
      throw new Error("You do not have permission to reorder blocks in this entry.");
    }

    const entryBlocks = Object.values(blocks)
      .filter((block) => block.entryId === entryId)
      .sort((a, b) => a.order - b.order);

    const currentIndex = entryBlocks.findIndex((block) => block.id === blockId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

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

  const value = {
    entries,
    blocks,
    markers,
    loading,
    canEditEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    createBlock,
    updateBlock,
    deleteBlock,
    createMarker,
    updateMarker,
    deleteMarker,
    moveBlock,
  };

  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>;
}

export function useWiki() {
  const ctx = useContext(WikiContext);

  if (!ctx) {
    throw new Error("useWiki must be used within a WikiProvider");
  }

  return ctx;
}
