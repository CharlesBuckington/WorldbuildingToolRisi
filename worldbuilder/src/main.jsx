// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { WikiProvider } from "./store/wikiStore.jsx";
import { AuthProvider } from "./store/authStore.jsx";
import "leaflet/dist/leaflet.css";
import "./styles/entry-theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WikiProvider>
          <App />
        </WikiProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);