// src/components/ImageMap.jsx
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Fallback default marker icon (you can swap this for a local one)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Simple icon cache so we don’t recreate them on every render
const iconCache = {};

function getIconForMarker(marker) {
  const key = marker.iconKey || "default";

  if (key === "default") {
    return defaultIcon;
  }

  if (!iconCache[key]) {
    // Convention: icon files live in /public/Img/markers/<key>.png
    iconCache[key] = new L.Icon({
      iconUrl: `/Img/markers/${key}.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
  }

  return iconCache[key];
}

function ClickHandler({ imageWidth, imageHeight, onMapClick }) {
  useMapEvents({
    click(e) {
      if (!onMapClick) return;

      const { lat, lng } = e.latlng; // CRS.Simple space
      const xRel = lng / imageWidth;
      const yRel = lat / imageHeight;

      if (xRel < 0 || xRel > 1 || yRel < 0 || yRel > 1) return;

      const originalEvent = e.originalEvent;
      const screenX = originalEvent?.clientX ?? 0;
      const screenY = originalEvent?.clientY ?? 0;

      onMapClick({
        x: xRel,
        y: yRel,
        latlng: e.latlng,
        screenX,
        screenY,
      });
    },

    // Optional: also support right-click for context menu feeling
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
        latlng: e.latlng,
        screenX,
        screenY,
      });
    },
  });

  return null;
}

/**
 * Props:
 * - imageUrl: string (e.g. "/Img/Worldmap.png")
 * - width: number
 * - height: number
 * - markers: array of { id, x, y, label, iconKey?, ... }
 * - onMarkerClick(marker)
 * - onMapClick({ x, y, screenX, screenY, latlng })
 */
function ImageMap({
  imageUrl,
  width,
  height,
  markers,
  onMarkerClick,
  onMapClick,
}) {
  const bounds = [
    [0, 0],
    [height, width],
  ];

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      style={{ width: "100%", height: "70vh", background: "#000" }}
      minZoom={-2}
      maxZoom={4}
    >
      <ImageOverlay url={imageUrl} bounds={bounds} />

      <ClickHandler
        imageWidth={width}
        imageHeight={height}
        onMapClick={onMapClick}
      />

      {markers.map((marker) => {
        const x = marker.x * width;
        const y = marker.y * height;
        const position = [y, x];

        return (
          <Marker
            key={marker.id}
            position={position}
            icon={getIconForMarker(marker)}
            eventHandlers={{
              click: () => onMarkerClick?.(marker),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
              {marker.label || "Unnamed"}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default ImageMap;