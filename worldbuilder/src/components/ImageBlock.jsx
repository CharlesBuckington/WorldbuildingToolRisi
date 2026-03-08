// src/components/ImageBlock.jsx
import { useWiki } from "../store/wikiStore.jsx";

function ImageBlock({ block, mode, onDelete, canMoveUp, canMoveDown, onMoveUp, onMoveDown }) {
  const { updateBlock } = useWiki();

  return (
    <section className="content-block image-block">
      {mode === "edit" ? (
        <>
          <div className="block-edit-fields">
            <label className="field-label">Image filename</label>
            <input
              className="fantasy-input"
              value={block.imageFilename || ""}
              onChange={(e) =>
                updateBlock(block.id, { imageFilename: e.target.value })
              }
              placeholder="Image filename in public/Img"
            />

            <label className="field-label">Caption</label>
            <input
              className="fantasy-input"
              value={block.caption || ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              placeholder="Caption"
            />
          </div>

          {block.imageFilename ? (
            <div className="image-block__preview">
              <img
                src={`/Img/${block.imageFilename}`}
                alt={block.caption || ""}
                className="image-block__img"
              />
            </div>
          ) : (
            <p className="block-placeholder">
              Add an image filename to display the image here.
            </p>
          )}

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
              Delete Image Block
            </button>
          </div>
        </>
      ) : (
        <>
          {block.imageFilename && (
            <div className="image-block__preview">
              <img
                src={`/Img/${block.imageFilename}`}
                alt={block.caption || ""}
                className="image-block__img"
              />
            </div>
          )}

          {block.caption && <p className="image-block__caption">{block.caption}</p>}
        </>
      )}
    </section>
  );
}

export default ImageBlock;