import { useMemo } from "react";
import { useWiki } from "../store/wikiStore.jsx";

const DEFAULT_FIELDS = {
  name: "",
  faction: "",
  race: "",
  gender: "",
  occupation: "",
  height: "",
  weight: "",
  age: "",
  residence: "",
};

const FIELD_LABELS = {
  name: "Name",
  faction: "Faction",
  race: "Race",
  gender: "Gender",
  occupation: "Occupation",
  height: "Height",
  weight: "Weight",
  age: "Age",
  residence: "Residence",
};

function CharacterProfileBlock({
  block,
  mode,
  onDelete,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}) {
  const { updateBlock } = useWiki();

  const fields = useMemo(() => {
    return {
      ...DEFAULT_FIELDS,
      ...(block.fields ?? {}),
    };
  }, [block.fields]);

  const handleFieldChange = async (fieldKey, value) => {
    await updateBlock(block.id, {
      fields: {
        ...fields,
        [fieldKey]: value,
      },
    });
  };

  const visibleEntries = Object.entries(fields).filter(([, value]) => {
    return String(value || "").trim() !== "";
  });

  return (
    <section className="content-block character-profile-block">
      {mode === "edit" ? (
        <>
          <div className="block-edit-fields">
            {Object.entries(FIELD_LABELS).map(([fieldKey, label]) => (
              <div key={fieldKey}>
                <label className="field-label">{label}</label>
                <input
                  className="fantasy-input"
                  type="text"
                  value={fields[fieldKey]}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  placeholder={label}
                />
              </div>
            ))}
          </div>

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

            <button className="fantasy-button danger" type="button" onClick={onDelete}>
              Delete Character Block
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="character-profile-block__header">
            <h3 className="character-profile-block__title">Character Profile</h3>
          </div>

          {visibleEntries.length === 0 ? (
            <p className="block-placeholder">No character details added yet.</p>
          ) : (
            <div className="character-profile-grid">
              {visibleEntries.map(([fieldKey, value]) => (
                <div key={fieldKey} className="character-profile-item">
                  <div className="character-profile-item__label">
                    {FIELD_LABELS[fieldKey]}
                  </div>
                  <div className="character-profile-item__value">{value}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CharacterProfileBlock;