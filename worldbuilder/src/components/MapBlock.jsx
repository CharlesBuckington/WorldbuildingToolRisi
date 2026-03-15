// src/components/MapBlock.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore.jsx";
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

function MapClickHandler({ imageWidth, imageHeight, onMapClick, enabled }) {
  useMapEvents({
    click(e) {
      if (!enabled || !onMapClick) return;

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
      if (!enabled || !onMapClick) return;

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

function MapBlock({ block, mode, markers, onDelete, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) {
  const { isAdmin } = useAuth();
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
    if (mode !== "edit") return;

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
      visibility: "public",
    });
  };

  const handleMarkerClick = (marker, event) => {
    if (mode === "view") {
      if (marker.entryId) {
        navigate(`/entry/${marker.entryId}`);
      }
      return;
    }

    const originalEvent = event?.originalEvent;
    const screenX = originalEvent?.clientX ?? window.innerWidth / 2;
    const screenY = originalEvent?.clientY ?? window.innerHeight / 2;

    setPendingMarker(null);
    setEditingMarker({
      ...marker,
      screenX,
      screenY,
      targetEntryId: marker.entryId || "",
      visibility: marker.visibility || "public",
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
      visibility: pendingMarker.visibility,
    });

    setPendingMarker(null);
  };

  const handleSaveEditedMarker = async () => {
    if (!editingMarker) return;

    const entryId = editingMarker.targetEntryId || null;
    let label = editingMarker.label.trim() || "Marker";

    if (entryId && entries[entryId] && !editingMarker.label.trim()) {
      label = entries[entryId].title;
    }

    await updateMarker(editingMarker.id, {
      entryId,
      label,
      iconKey: editingMarker.iconKey,
      visibility: editingMarker.visibility,
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
    if (!menuState || mode !== "edit") return null;

    return (
      <div className="marker-menu-backdrop" onClick={() => {
        if (isEditing) {
          setEditingMarker(null);
        } else {
          setPendingMarker(null);
        }
      }}>
        <div
          className="marker-menu"
          style={{
            top: menuState.screenY,
            left: menuState.screenX,
          }}
          onClick={(e) => e.stopPropagation()}
        >

          <div className="marker-menu__title">
            {isEditing ? "Edit Marker" : "Create Marker"}
          </div>

          {isAdmin && (
            <>
              <label className="field-label">Visibility</label>
              <select
                className="fantasy-input"
                value={menuState.visibility || "public"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isEditing) {
                    setEditingMarker((prev) => ({ ...prev, visibility: value }));
                  } else {
                    setPendingMarker((prev) => ({ ...prev, visibility: value }));
                  }
                }}
              >
                <option value="public">Public</option>
                <option value="admin">Admin Only</option>
              </select>
            </>
          )}

          <label className="field-label">Label</label>
          <input
            className="fantasy-input"
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
          />

          <label className="field-label">Icon</label>
          <select
            className="fantasy-input"
            value={menuState.iconKey}
            onChange={(e) => {
              const value = e.target.value;
              if (isEditing) {
                setEditingMarker((prev) => ({ ...prev, iconKey: value }));
              } else {
                setPendingMarker((prev) => ({ ...prev, iconKey: value }));
              }
            }}
          >
            {ICON_OPTIONS.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </select>

          {!isEditing && (
            <label className="checkbox-row">
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
              />
              Create new linked entry
            </label>
          )}

          {(!menuState.createNewEntry || isEditing) && (
            <>
              <label className="field-label">Linked Entry</label>
              <select
                className="fantasy-input"
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

          <div className="block-actions">
            {isEditing && editingMarker?.entryId && (
              <button className="fantasy-button secondary" type="button" onClick={handleOpenLinkedEntry}>
                Open Entry
              </button>
            )}

            {isEditing && (
              <button className="fantasy-button danger" type="button" onClick={handleDeleteEditedMarker}>
                Delete
              </button>
            )}

            <button
              className="fantasy-button secondary"
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
              className="fantasy-button"
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
    <section className="content-block map-block">
      {mode === "edit" && (
        <div className="block-edit-fields">
          <label className="field-label">Map image filename</label>
          <input
            className="fantasy-input"
            value={block.imageFilename || ""}
            onChange={(e) => updateBlock(block.id, { imageFilename: e.target.value })}
            placeholder="Map image filename in public/Img"
          />

          <label className="field-label">Caption</label>
          <input
            className="fantasy-input"
            value={block.caption || ""}
            onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
            placeholder="Caption"
          />
        </div>
      )}

      {!block.imageFilename && mode === "edit" && (
        <p className="block-placeholder">
          Enter an image filename to use this as a map block.
        </p>
      )}

      {block.imageFilename && !hasValidImage && (
        <p className="block-placeholder">Loading map image and dimensions…</p>
      )}

      {hasValidImage && (
        <>
          <div className="map-block__frame">
            <MapContainer
              crs={L.CRS.Simple}
              bounds={bounds}
              style={{ width: "100%", height: "70vh", background: "#1a1712" }}
              minZoom={-2}
              maxZoom={4}
            >
              <ImageOverlay url={`/Img/${block.imageFilename}`} bounds={bounds} />

              <MapClickHandler
                imageWidth={block.width}
                imageHeight={block.height}
                onMapClick={handleMapClick}
                enabled={mode === "edit"}
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
          </div>

          {block.caption && <p className="image-block__caption">{block.caption}</p>}
        </>
      )}

      {mode === "edit" && (
        <div className="block-actions">
          <button
            className="fantasy-button secondary"
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          >
            ↑ Move Up
          </button>

          <button
            className="fantasy-button secondary"
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          >
            ↓ Move Down
          </button>

          <button className="fantasy-button danger" onClick={onDelete}>
            Delete Map Block
          </button>
        </div>
      )}

      {renderMarkerMenu(pendingMarker, false)}
      {renderMarkerMenu(editingMarker, true)}
    </section>
  );
}

export default MapBlock;