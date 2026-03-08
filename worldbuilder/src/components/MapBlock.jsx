// src/components/MapBlock.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useWiki } from "../store/wikiStore.jsx";

const ICON_OPTIONS = [
  { value: "default", label: "Default Marker" },
  { value: "city", label: "City Marker" },
  { value: "dungeon", label: "Dungeon Marker" },
  { value: "poi", label: "POI Marker" },
];

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const iconCache = {};

function getIconForMarker(marker) {
  const key = marker.iconKey || "default";

  if (key === "default") {
    return defaultIcon;
  }

  if (!iconCache[key]) {
    iconCache[key] = new L.Icon({
      iconUrl: `/Img/markers/${key}.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
  }

  return iconCache[key];
}

function MapClickHandler({ imageWidth, imageHeight, onMapClick }) {
  useMapEvents({
    click(e) {
      if (!onMapClick) return;

      const { lat, lng } = e.latlng;
      const xRel = lng / imageWidth;
      const yRel = lat / imageHeight;

      if (xRel < 0 || xRel > 1 || yRel < 0 || yRel > 1) return;

      const originalEvent = e.originalEvent;
      const screenX = originalEvent?.clientX ?? 0;
      const screenY = originalEvent?.clientY ?? 0;

      onMapClick({
        x: xRel,
        y: yRel,
        screenX,
        screenY,
      });
    },

    contextmenu(e) {
      if (!onMapClick) return;

      const { lat, lng } = e.latlng;
      const xRel = lng / imageWidth;
      const yRel = lat / imageHeight;

      if (xRel < 0 || xRel > 1 || yRel < 0 || yRel > 1) return;

      const originalEvent = e.originalEvent;
      const screenX = originalEvent?.clientX ?? 0;
      const screenY = originalEvent?.clientY ?? 0;

      onMapClick({
        x: xRel,
        y: yRel,
        screenX,
        screenY,
      });
    },
  });

  return null;
}

function MapBlock({ block, markers, onDelete }) {
  const navigate = useNavigate();
  const {
    entries,
    updateBlock,
    createMarker,
    updateMarker,
    deleteMarker,
    createEntry,
  } = useWiki();

  const [pendingMarker, setPendingMarker] = useState(null);
  const [editingMarker, setEditingMarker] = useState(null);

  const entriesArray = useMemo(() => Object.values(entries), [entries]);

  useEffect(() => {
    if (!block.imageFilename || (block.width && block.height)) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      updateBlock(block.id, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      console.error("Failed to load map image:", block.imageFilename);
    };
    img.src = `/Img/${block.imageFilename}`;
  }, [block.id, block.imageFilename, block.width, block.height, updateBlock]);

  const handleMapClick = ({ x, y, screenX, screenY }) => {
    setEditingMarker(null);
    setPendingMarker({
      x,
      y,
      screenX,
      screenY,
      label: "",
      iconKey: "default",
      targetEntryId: "",
      createNewEntry: false,
    });
  };

  const handleMarkerClick = (marker, event) => {
    const originalEvent = event?.originalEvent;
    const screenX = originalEvent?.clientX ?? window.innerWidth / 2;
    const screenY = originalEvent?.clientY ?? window.innerHeight / 2;

    setPendingMarker(null);
    setEditingMarker({
      ...marker,
      screenX,
      screenY,
      targetEntryId: marker.entryId || "",
    });
  };

  const handleConfirmNewMarker = async () => {
    if (!pendingMarker) return;

    let entryId = pendingMarker.targetEntryId || null;
    let label = pendingMarker.label.trim() || "New Marker";

    if (pendingMarker.createNewEntry) {
      const newEntry = await createEntry({
        title: label,
        type: "location",
      });
      entryId = newEntry.id;
      label = newEntry.title;
    } else if (entryId && entries[entryId]) {
      label = pendingMarker.label.trim() || entries[entryId].title;
    }

    await createMarker({
      blockId: block.id,
      entryId,
      x: pendingMarker.x,
      y: pendingMarker.y,
      label,
      iconKey: pendingMarker.iconKey,
    });

    setPendingMarker(null);
  };

  const handleSaveEditedMarker = async () => {
    if (!editingMarker) return;

    let entryId = editingMarker.targetEntryId || null;
    let label = editingMarker.label.trim() || "Marker";

    if (entryId && entries[entryId] && !editingMarker.label.trim()) {
      label = entries[entryId].title;
    }

    await updateMarker(editingMarker.id, {
      entryId,
      label,
      iconKey: editingMarker.iconKey,
    });

    setEditingMarker(null);
  };

  const handleDeleteEditedMarker = async () => {
    if (!editingMarker) return;
    await deleteMarker(editingMarker.id);
    setEditingMarker(null);
  };

  const handleOpenLinkedEntry = () => {
    if (!editingMarker?.entryId) return;
    navigate(`/entry/${editingMarker.entryId}`);
  };

  const renderMarkerMenu = (menuState, isEditing) => {
    if (!menuState) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "transparent",
        }}
        onClick={() => {
          if (isEditing) {
            setEditingMarker(null);
          } else {
            setPendingMarker(null);
          }
        }}
      >
        <div
          style={{
            position: "fixed",
            top: menuState.screenY,
            left: menuState.screenX,
            transform: "translate(8px, 8px)",
            background: "#111827",
            color: "#F9FAFB",
            padding: "0.75rem 0.9rem",
            borderRadius: "0.5rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.45)",
            minWidth: "270px",
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
            {isEditing ? "Edit Marker" : "Create Marker"}
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
            Label
          </label>
          <input
            type="text"
            value={menuState.label}
            onChange={(e) => {
              const value = e.target.value;
              if (isEditing) {
                setEditingMarker((prev) => ({ ...prev, label: value }));
              } else {
                setPendingMarker((prev) => ({ ...prev, label: value }));
              }
            }}
            placeholder="Marker label"
            style={{
              width: "100%",
              marginBottom: "0.5rem",
              padding: "0.35rem 0.45rem",
              borderRadius: "0.25rem",
              border: "1px solid #374151",
              background: "#020617",
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
            Icon
          </label>
          <select
            value={menuState.iconKey}
            onChange={(e) => {
              const value = e.target.value;
              if (isEditing) {
                setEditingMarker((prev) => ({ ...prev, iconKey: value }));
              } else {
                setPendingMarker((prev) => ({ ...prev, iconKey: value }));
              }
            }}
            style={{
              width: "100%",
              marginBottom: "0.5rem",
              padding: "0.35rem 0.45rem",
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

          {!isEditing && (
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <input
                type="checkbox"
                checked={menuState.createNewEntry}
                onChange={(e) =>
                  setPendingMarker((prev) => ({
                    ...prev,
                    createNewEntry: e.target.checked,
                    targetEntryId: "",
                  }))
                }
                style={{ marginRight: "0.5rem" }}
              />
              Create new linked entry
            </label>
          )}

          {(!menuState.createNewEntry || isEditing) && (
            <>
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
                Linked Entry
              </label>
              <select
                value={menuState.targetEntryId || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isEditing) {
                    setEditingMarker((prev) => ({
                      ...prev,
                      targetEntryId: value,
                    }));
                  } else {
                    setPendingMarker((prev) => ({
                      ...prev,
                      targetEntryId: value,
                    }));
                  }
                }}
                style={{
                  width: "100%",
                  marginBottom: "0.75rem",
                  padding: "0.35rem 0.45rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#F9FAFB",
                }}
              >
                <option value="">No linked entry</option>
                {entriesArray.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title} ({entry.type})
                  </option>
                ))}
              </select>
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {isEditing && editingMarker?.entryId && (
              <button type="button" onClick={handleOpenLinkedEntry}>
                Open Entry
              </button>
            )}

            {isEditing && (
              <button type="button" onClick={handleDeleteEditedMarker}>
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setEditingMarker(null);
                } else {
                  setPendingMarker(null);
                }
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={isEditing ? handleSaveEditedMarker : handleConfirmNewMarker}
            >
              {isEditing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hasValidImage = Boolean(block.imageFilename && block.width && block.height);
  const bounds = hasValidImage
    ? [
        [0, 0],
        [block.height, block.width],
      ]
    : null;

  return (
    <div className="card">
      <input
        value={block.imageFilename || ""}
        onChange={(e) => updateBlock(block.id, { imageFilename: e.target.value })}
        placeholder="Map image filename in public/Img"
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <input
        value={block.caption || ""}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Caption"
        style={{ width: "100%", marginBottom: "0.75rem" }}
      />

      {!block.imageFilename && (
        <p style={{ opacity: 0.7 }}>
          Enter an image filename to use this as a map block.
        </p>
      )}

      {block.imageFilename && !hasValidImage && (
        <p style={{ opacity: 0.7 }}>Loading map image and dimensions…</p>
      )}

      {hasValidImage && (
        <MapContainer
          crs={L.CRS.Simple}
          bounds={bounds}
          style={{ width: "100%", height: "70vh", background: "#000" }}
          minZoom={-2}
          maxZoom={4}
        >
          <ImageOverlay url={`/Img/${block.imageFilename}`} bounds={bounds} />

          <MapClickHandler
            imageWidth={block.width}
            imageHeight={block.height}
            onMapClick={handleMapClick}
          />

          {markers.map((marker) => {
            const x = marker.x * block.width;
            const y = marker.y * block.height;
            const position = [y, x];

            return (
              <Marker
                key={marker.id}
                position={position}
                icon={getIconForMarker(marker)}
                eventHandlers={{
                  click: (e) => handleMarkerClick(marker, e),
                  contextmenu: (e) => handleMarkerClick(marker, e),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  {marker.label || "Unnamed"}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      )}

      <div style={{ marginTop: "0.75rem" }}>
        <button onClick={onDelete}>Delete Map Block</button>
      </div>

      {renderMarkerMenu(pendingMarker, false)}
      {renderMarkerMenu(editingMarker, true)}
    </div>
  );
}

export default MapBlock;