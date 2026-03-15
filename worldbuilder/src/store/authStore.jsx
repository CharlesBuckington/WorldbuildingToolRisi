// src/store/authStore.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setAuthLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        } else {
          // fallback profile if no Firestore user doc exists yet
          const fallbackProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || "Adventurer",
            role: "user",
          };
          setUserProfile(fallbackProfile);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        setUserProfile(null);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async ({ email, password, displayName }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName.trim()) {
      await updateProfile(result.user, {
        displayName: displayName.trim(),
      });
    }

    // Create default Firestore profile for self-signup users
    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      displayName: displayName.trim() || "Adventurer",
      role: "user",
    });

    return result.user;
  };

  const login = async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userProfile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        authLoading,
        signup,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}