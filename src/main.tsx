import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";

export const authService = import.meta.env.DEV ? "http://localhost:5000" : "https://deliverme-auth.onrender.com";
export const restaurantService = import.meta.env.DEV ? "http://localhost:5001" : "https://deliverme-restaurant.onrender.com";
export const utilsService = import.meta.env.DEV ? "http://localhost:5002" : "https://deliverme-utils.onrender.com";
export const realtimeService = import.meta.env.DEV ? "http://localhost:5004" : "https://deliverme-realtime.onrender.com";
export const riderService = import.meta.env.DEV ? "http://localhost:5005" : "https://deliverme-rider.onrender.com";
export const adminService = import.meta.env.DEV ? "http://localhost:5003" : "https://deliverme-admin.onrender.com";
export const aiService = import.meta.env.DEV ? "http://localhost:5006" : "https://deliverme-ai.onrender.com";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="669298433327-9nbunn537i89nb52vk8lpopioupnh988.apps.googleusercontent.com">
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
