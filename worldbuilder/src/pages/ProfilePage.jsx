import { useEffect, useState } from "react";
import { useAuth } from "../store/authStore.jsx";

function ProfilePage() {
  const { userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    setDisplayName(userProfile?.displayName ?? "");
    setPhotoURL(userProfile?.photoURL ?? "");
  }, [userProfile]);

  const handleSaveProfile = async () => {
    setSaveState("saving");

    try {
      await updateUserProfile({
        displayName: displayName.trim() || "Adventurer",
        photoURL: photoURL.trim(),
      });

      setSaveState("saved");
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveState("error");
    }
  };

  return (
    <div className="page profile-page">
      <section className="content-block profile-card">
        <p className="home-card__eyebrow">Account</p>
        <h2 className="page-title">Profile Settings</h2>
        <p className="home-card__text">
          Customize how your account appears across the campaign wiki.
        </p>

        <div className="profile-preview">
          {photoURL.trim() ? (
            <img
              src={photoURL}
              alt={displayName || "Profile"}
              className="profile-preview__image"
            />
          ) : (
            <div className="profile-preview__image profile-preview__image--placeholder">
              {(displayName || "A").slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="profile-preview__meta">
            <div className="profile-preview__name">
              {displayName.trim() || "Adventurer"}
            </div>
            <div className="profile-preview__subtitle">
              This preview is used in the topbar and party overview.
            </div>
          </div>
        </div>

        <div className="block-edit-fields">
          <label className="field-label">Display Name</label>
          <input
            className="fantasy-input"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />

          <label className="field-label">Profile Image URL</label>
          <input
            className="fantasy-input"
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://example.com/profile.png"
          />
        </div>

        <div className="block-actions">
          <button
            className="fantasy-button"
            type="button"
            onClick={handleSaveProfile}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {saveState === "saved" && (
          <p className="profile-save-message">Profile saved successfully.</p>
        )}

        {saveState === "error" && (
          <p className="profile-save-message profile-save-message--error">
            Could not save profile.
          </p>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;