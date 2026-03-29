import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWiki } from "../store/wikiStore.jsx";
import { useAuth } from "../store/authStore.jsx";

function MyPartyPage() {
  const { entries } = useWiki();
  const { allUserProfiles, activeCampaignId } = useAuth();

  const partyMembers = useMemo(() => {
    return Object.values(allUserProfiles)
      .map((profile) => {
        const characterEntryId = profile.playerCharacterEntryId ?? null;
        const characterEntry = characterEntryId ? entries[characterEntryId] : null;

        return {
          uid: profile.userUid,
          displayName: profile.displayName || "Adventurer",
          photoURL: profile.photoURL || "",
          characterEntryId,
          characterEntry,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUserProfiles, entries]);

  if (!activeCampaignId) {
    return (
      <div className="page">
        <h2 className="page-title">My Party</h2>
        <p>Select a campaign from the homepage before opening the party view.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">My Party</h2>

      <p className="home-card__text" style={{ marginBottom: "1rem" }}>
        All players currently linked to the active campaign.
      </p>

      {partyMembers.length === 0 && (
        <p>No party members found for this campaign yet.</p>
      )}

      {partyMembers.length > 0 && (
        <div className="party-grid">
          {partyMembers.map((member) => (
            <section key={member.uid} className="content-block party-card">
              <div className="party-card__header">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="party-card__avatar"
                  />
                ) : (
                  <div className="party-card__avatar party-card__avatar--placeholder">
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="party-card__identity">
                  <h3 className="party-card__name">{member.displayName}</h3>
                  <p className="party-card__subtitle">Campaign member</p>
                </div>
              </div>

              <div className="party-card__body">
                {member.characterEntry ? (
                  <>
                    <p className="party-card__label">Player Character</p>
                    <Link
                      to={`/entry/${member.characterEntry.id}`}
                      className="entry-link"
                    >
                      {member.characterEntry.title}
                    </Link>
                    <span className="entry-type-label">
                      ({member.characterEntry.type})
                    </span>

                    <div className="block-actions">
                      <Link
                        className="fantasy-button secondary"
                        to={`/entry/${member.characterEntry.id}`}
                      >
                        Open Character
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="party-card__label">Player Character</p>
                    <p className="home-card__text">
                      No character linked yet.
                    </p>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPartyPage;
