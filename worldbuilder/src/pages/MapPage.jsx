// src/pages/MapPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorld } from "../store/worldStore.jsx";
import ImageMap from "../components/ImageMap.jsx";

const SITE_TYPES = [
  { value: "location", label: "Location" },
  { value: "city", label: "City / Town" },
  { value: "dungeon", label: "Dungeon" },
  { value: "poi", label: "Point of Interest" },
];

const ICON_OPTIONS = [
  { value: "default", label: "Default Marker" },
  { value: "city", label: "City Marker" },
  { value: "dungeon", label: "Dungeon Marker" },
  { value: "poi", label: "POI Marker" },
];

function MapPage() {
  const { mapId } = useParams();
  const {
    maps,
    markers,
    sites,
    loading,
    createSite,
    createMarker,
    updateMarker,
    updateMap,
  } = useWorld();
  const navigate = useNavigate();

  const mapsArray = useMemo(() => Object.values(maps), [maps]);
  let effectiveMapId = mapId;

  if (!effectiveMapId && mapsArray.length > 0) {
    effectiveMapId = mapsArray[0].id;
  }

  const map = effectiveMapId ? maps[effectiveMapId] : null;

  const [dimensions, setDimensions] = useState(
    map && map.width && map.height
      ? { width: map.width, height: map.height }
      : null
  );

  // State for the "new marker" context menu
  const [pendingMarker, setPendingMarker] = useState(null);
  // pendingMarker: {
  //   x, y, screenX, screenY, title, type, iconKey
  // }

  // Load image dimensions if not already known
  useEffect(() => {
    if (!map) return;

    if (map.width && map.height) {
      setDimensions({ width: map.width, height: map.height });
      return;
    }

    const imageUrl = `/Img/${map.imageFilename}`;
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      setDimensions({ width, height });
      // Cache in Firestore
      updateMap(map.id, { width, height }).catch((err) =>
        console.error("Failed to update map dimensions:", err)
      );
    };
    img.onerror = () => {
      console.error("Failed to load map image:", imageUrl);
    };
    img.src = imageUrl;
  }, [map, updateMap]);

  if (loading && !map) {
    return (
      <div className="page">
        <p>Loading world from Firebase…</p>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="page">
        <h2>Maps</h2>
        {mapsArray.length === 0 ? (
          <p>No maps yet. Go to Home and create one.</p>
        ) : (
          <p>Unknown map. Select from Home page.</p>
        )}
      </div>
    );
  }

  const imageUrl = `/Img/${map.imageFilename}`;
  const mapMarkers = Object.values(markers).filter(
    (m) => m.mapId === map.id
  );

  const handleMarkerClick = async (marker) => {
    if (marker.siteId && sites[marker.siteId]) {
      navigate(`/site/${marker.siteId}`);
      return;
    }

    // Fallback: create a site if marker somehow has none
    const title = window.prompt(
      "Create site for this marker. Site title:",
      "New Site"
    );
    const site = await createSite({ title: title || "New Site" });
    await updateMarker(marker.id, {
      siteId: site.id,
      label: site.title,
    });
    navigate(`/site/${site.id}`);
  };

  // Map click → open context menu
  const handleMapClick = ({ x, y, screenX, screenY }) => {
    setPendingMarker({
      x,
      y,
      screenX,
      screenY,
      title: "",
      type: "location",
      iconKey: "default",
    });
  };

  const handleContextMenuFieldChange = (field, value) => {
    setPendingMarker((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleContextMenuCancel = () => {
    setPendingMarker(null);
  };

  const handleContextMenuConfirm = async () => {
    if (!pendingMarker) return;

    const { x, y, title, type, iconKey } = pendingMarker;
    const trimmedTitle = (title || "").trim();
    const finalTitle = trimmedTitle === "" ? "New Site" : trimmedTitle;

    try {
      const site = await createSite({
        title: finalTitle,
        type: type || "location",
      });

      await createMarker({
        mapId: map.id,
        x,
        y,
        label: finalTitle,
        siteId: site.id,
        iconKey: iconKey || "default",
      });

      // Stay on the map (no auto-navigation)
      setPendingMarker(null);
    } catch (err) {
      console.error("Failed to create site/marker from context menu:", err);
    }
  };

  return (
    <div className="page">
      <h2>{map.name}</h2>
      <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
        Image file: <code>{map.imageFilename}</code>
      </p>
      <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
        Click on the map to open a context menu and create a new Site +
        Marker. Click on an existing marker to open its Site.
      </p>

      {!dimensions && <p>Loading map image and dimensions…</p>}

      {dimensions && (
        <ImageMap
          imageUrl={imageUrl}
          width={dimensions.width}
          height={dimensions.height}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
        />
      )}

      {/* Context menu overlay for new marker */}
      {pendingMarker && (
        <div
          className="map-context-menu-backdrop"
          onClick={handleContextMenuCancel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "transparent",
          }}
        >
          <div
            className="map-context-menu"
            style={{
              position: "fixed",
              top: pendingMarker.screenY,
              left: pendingMarker.screenX,
              transform: "translate(8px, 8px)",
              zIndex: 1000,
              background: "#111827",
              color: "#F9FAFB",
              padding: "0.75rem 0.9rem",
              borderRadius: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
              minWidth: "230px",
              fontSize: "0.9rem",
            }}
            onClick={(e) => e.stopPropagation()} // don’t close when clicking inside
          >
            <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
              New Site here?
            </div>

            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              Title
            </label>
            <input
              type="text"
              value={pendingMarker.title}
              onChange={(e) =>
                handleContextMenuFieldChange("title", e.target.value)
              }
              placeholder="New Site"
              style={{
                width: "100%",
                marginBottom: "0.5rem",
                padding: "0.25rem 0.4rem",
                borderRadius: "0.25rem",
                border: "1px solid #374151",
                background: "#0B1120",
                color: "#F9FAFB",
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              Type
            </label>
            <select
              value={pendingMarker.type}
              onChange={(e) =>
                handleContextMenuFieldChange("type", e.target.value)
              }
              style={{
                width: "100%",
                marginBottom: "0.5rem",
                padding: "0.25rem 0.4rem",
                borderRadius: "0.25rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#F9FAFB",
              }}
            >
              {SITE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "block",
                marginBottom: "0.25rem",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              Icon
            </label>
            <select
              value={pendingMarker.iconKey}
              onChange={(e) =>
                handleContextMenuFieldChange("iconKey", e.target.value)
              }
              style={{
                width: "100%",
                marginBottom: "0.75rem",
                padding: "0.25rem 0.4rem",
                borderRadius: "0.25rem",
                border: "1px solid #374151",
                background: "#020617",
                color: "#F9FAFB",
              }}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon.value} value={icon.value}>
                  {icon.label}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              <button
                type="button"
                onClick={handleContextMenuCancel}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#E5E7EB",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContextMenuConfirm}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.25rem",
                  border: "none",
                  background: "#2563EB",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;