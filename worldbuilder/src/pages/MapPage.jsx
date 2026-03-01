import { useState, useRef } from "react";

function MapPage() {
  const [mapImage, setMapImage] = useState(null);      // data URL
  const [markers, setMarkers] = useState([]);          // { x, y } in relative coords
  const mapContainerRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setMapImage(e.target.result);
      setMarkers([]); // reset markers when new map is loaded
    };
    reader.readAsDataURL(file);
  };

  const handleMapClick = (event) => {
    if (!mapContainerRef.current || !mapImage) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setMarkers((prev) => [...prev, { x, y }]);
  };

  return (
    <div className="page">
      <h2>Map</h2>

      <section style={{ marginBottom: "1rem" }}>
        <label>
          <strong>Import map image (PNG/JPG):</strong>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ display: "block", marginTop: "0.5rem" }}
          />
        </label>
      </section>

      {!mapImage && <p>No map loaded yet. Choose an image above.</p>}

      {mapImage && (
        <div
          ref={mapContainerRef}
          style={{
            position: "relative",
            maxWidth: "100%",
            border: "1px solid #4b5563",
            overflow: "hidden",
            cursor: "crosshair",
          }}
          onClick={handleMapClick}
        >
          <img
            src={mapImage}
            alt="World map"
            style={{ width: "100%", display: "block" }}
          />

          {markers.map((marker, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${marker.x * 100}%`,
                top: `${marker.y * 100}%`,
                transform: "translate(-50%, -100%)",
                background: "#f97316",
                borderRadius: "999px",
                padding: "2px 6px",
                fontSize: "0.75rem",
                pointerEvents: "none",
              }}
            >
              ●
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapPage;