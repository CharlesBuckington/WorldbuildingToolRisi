// src/pages/LoginPage.jsx
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore.jsx";

function LoginPage() {
  const { user, login, signup, authLoading } = useAuth();

  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="page auth-page">
        <div className="auth-card">
          <p>Loading authentication…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signup({
          email,
          password,
          displayName,
        });
      } else {
        await login({
          email,
          password,
        });
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <h2 className="page-title">
          {mode === "login" ? "Enter the Archive" : "Create an Account"}
        </h2>

        <p className="muted-text">
          {mode === "login"
            ? "Log in to continue to your worldbuilding tool."
            : "Create your account to begin building your world."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <>
              <label className="field-label">Display Name</label>
              <input
                className="fantasy-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dungeon Master Risi"
                required
              />
            </>
          )}

          <label className="field-label">Email</label>
          <input
            className="fantasy-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label className="field-label">Password</label>
          <input
            className="fantasy-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />

          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button className="fantasy-button auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
              ? "Log In"
              : "Create Account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <button
              type="button"
              className="fantasy-button secondary"
              onClick={() => {
                setMode("signup");
                setErrorMessage("");
              }}
            >
              Need an account?
            </button>
          ) : (
            <button
              type="button"
              className="fantasy-button secondary"
              onClick={() => {
                setMode("login");
                setErrorMessage("");
              }}
            >
              Already have an account?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getAuthErrorMessage(error) {
  const code = error?.code || "";

  if (code === "auth/email-already-in-use") {
    return "This email address is already in use.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/weak-password") {
    return "Your password is too weak.";
  }

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "Incorrect email or password.";
  }

  return "Authentication failed. Please try again.";
}

export default LoginPage;