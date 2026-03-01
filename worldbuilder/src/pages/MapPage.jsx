// src/pages/MapPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorld } from "../store/worldStore.jsx";
import ImageMap from "../components/ImageMap.jsx";

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

  const handleAddMarker = async ({ x, y }) => {
    const title = window.prompt(
      "New marker: give it a site name (this will also create the site). Leave empty for 'New Site'.",
      ""
    );
    const site = await createSite({ title: title || "New Site" });
    await createMarker({
      mapId: map.id,
      x,
      y,
      label: site.title,
      siteId: site.id,
    });
    navigate(`/site/${site.id}`);
  };

  return (
    <div className="page">
      <h2>{map.name}</h2>
      <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
        Image file: <code>{map.imageFilename}</code>
      </p>
      <p style={{ marginBottom: "0.5rem", opacity: 0.8 }}>
        Click on the map to create a new location (Site + Marker). Click on an
        existing marker to open its Site.
      </p>

      {!dimensions && <p>Loading map image and dimensions…</p>}

      {dimensions && (
        <ImageMap
          imageUrl={imageUrl}
          width={dimensions.width}
          height={dimensions.height}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          onAddMarker={handleAddMarker}
        />
      )}
    </div>
  );
}

export default MapPage;