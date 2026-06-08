import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";

export const authService = "https://deliverme-auth.onrender.com";
export const restaurantService = "https://deliverme-restaurant.onrender.com";
export const utilsService = "https://deliverme-utils.onrender.com";
export const realtimeService = "https://deliverme-realtime.onrender.com";
export const riderService = "https://deliverme-rider.onrender.com";
export const adminService = "https://deliverme-admin.onrender.com";
export const aiService = "https://deliverme-ai.onrender.com";

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
