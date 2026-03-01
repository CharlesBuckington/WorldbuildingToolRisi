// src/store/worldStore.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const WorldContext = createContext(null);

export function WorldProvider({ children }) {
  const [maps, setMaps] = useState({});
  const [markers, setMarkers] = useState({});
  const [sites, setSites] = useState({});
  const [loading, setLoading] = useState(true);

  // Subscribe to Firestore collections (real-time)
  useEffect(() => {
    const unsubMaps = onSnapshot(collection(db, "maps"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setMaps(next);
    });

    const unsubMarkers = onSnapshot(collection(db, "markers"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setMarkers(next);
    });

    const unsubSites = onSnapshot(collection(db, "sites"), (snapshot) => {
      const next = {};
      snapshot.forEach((docSnap) => {
        next[docSnap.id] = docSnap.data();
      });
      setSites(next);
      setLoading(false);
    });

    return () => {
      unsubMaps();
      unsubMarkers();
      unsubSites();
    };
  }, []);

  // Helper: create a Firestore doc with auto ID and store `id` inside document
  const createDocWithId = async (colName, data) => {
    const colRef = collection(db, colName);
    const docRef = doc(colRef); // auto ID
    const id = docRef.id;
    const fullData = { id, ...data };
    await setDoc(docRef, fullData);
    return fullData;
  };

  // Maps ----------------------------------------------------------------------
  // imageFilename is something like "Worldmap.png" in public/Img
  const createMap = async ({ name, imageFilename }) => {
    return createDocWithId("maps", {
      name,
      imageFilename,
      width: null,
      height: null,
    });
  };

  const updateMap = async (mapId, updates) => {
    const docRef = doc(db, "maps", mapId);
    await updateDoc(docRef, updates);
  };

  // Sites ---------------------------------------------------------------------
  const createSite = async (partial = {}) => {
    const site = {
      title: partial.title ?? "New Site",
      type: partial.type ?? "location",
      content: partial.content ?? "",
      linkedSiteIds: partial.linkedSiteIds ?? [],
    };
    return createDocWithId("sites", site);
  };

  const updateSite = async (siteId, updates) => {
    const docRef = doc(db, "sites", siteId);
    await updateDoc(docRef, updates);
  };

  // Markers -------------------------------------------------------------------
  const createMarker = async ({ mapId, x, y, label, siteId = null }) => {
    const marker = {
      mapId,
      x,
      y,
      label: label ?? "New Marker",
      siteId,
    };
    return createDocWithId("markers", marker);
  };

  const updateMarker = async (markerId, updates) => {
    const docRef = doc(db, "markers", markerId);
    await updateDoc(docRef, updates);
  };

  const value = {
    maps,
    markers,
    sites,
    loading,
    createMap,
    updateMap,
    createSite,
    updateSite,
    createMarker,
    updateMarker,
  };

  return (
    <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
  );
}

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) {
    throw new Error("useWorld must be used within a WorldProvider");
  }
  return ctx;
}