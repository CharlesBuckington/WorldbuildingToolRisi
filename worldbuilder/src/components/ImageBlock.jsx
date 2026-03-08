// src/components/ImageBlock.jsx
import { useWiki } from "../store/wikiStore.jsx";

function ImageBlock({ block, onDelete }) {
  const { updateBlock } = useWiki();

  return (
    <div className="card">
      <input
        value={block.imageFilename || ""}
        onChange={(e) => updateBlock(block.id, { imageFilename: e.target.value })}
        placeholder="Image filename in public/Img"
        style={{ width: "100%", marginBottom: "0.5rem" }}
      />

      <input
        value={block.caption || ""}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Caption"
        style={{ width: "100%", marginBottom: "0.75rem" }}
      />

      {block.imageFilename && (
        <img
          src={`/Img/${block.imageFilename}`}
          alt={block.caption || ""}
          style={{ maxWidth: "100%", display: "block", marginBottom: "0.75rem" }}
        />
      )}

      <button onClick={onDelete}>Delete Image Block</button>
    </div>
  );
}

export default ImageBlock;