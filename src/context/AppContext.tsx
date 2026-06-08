import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService, restaurantService } from "../main";
import type { AppContextType, ICart, LocationData, User } from "../types";
import { getCurrencyConfig, formatCurrency as formatCurrencyValue } from "../utils/currency";
import { Toaster } from "react-hot-toast";

type AppContextValue = AppContextType & { logout: () => void };
const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [city, setCity] = useState("Fetching Location...");

  const [currencyCode, setCurrencyCode] = useState("INR");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [currencyLocale, setCurrencyLocale] = useState("en-IN");
  const [currencyRate, setCurrencyRate] = useState(1);

  const [cart, setCart] = useState<ICart[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);

  async function fetchUser() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(data);
      
      setIsAuth(!!(data && data.role)); // Only authenticated if they have a role
    setLoading(false);
      
    } catch (error: any) {
    // 🎯 CRITICAL: Only clear session if the token is explicitly INVALID (401)
    if (error.response?.status === 401) {
      console.warn("Session expired or invalid. Logging out.");
      localStorage.removeItem("token");
      setUser(null);
      setIsAuth(false);
    } else {
      // If it's a 500 or network error, just stop loading but keep the user state
      console.error("Auth service error:", error);
    }
    setLoading(false);
  }
}
    
      
  

  async function fetchCart() {
    // 🎯 Optimization: Prevent role processing failures
    if (!user || user.role !== "customer") return;
    
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuauntity(data.cartLength || 0);
    } catch (error) {
      console.error("Error syncing cart data:", error);
    }
  }

  const logout = () => {
    localStorage.removeItem("token"); 
    setUser(null);                    
    setIsAuth(false);                 
    setCart([]);                      
    setSubTotal(0);                   
    setQuauntity(0);                  
  };

  // Run on base app initialization mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Sync cart only when a user successfully achieves a verified 'customer' status
  useEffect(() => {
    if (user && user.role === "customer") {
      fetchCart();
    } else {
      // Clear cart items if role changes away from customer (e.g., vendor switches profile)
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
    }
  }, [user]);

  // Geolocation Routine
  useEffect(() => {
    if (!navigator.geolocation) {
      setCity("Location Unsupported");
      return;
    }
    
    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          const countryCode = data.address?.country_code?.toUpperCase();
          const currency = getCurrencyConfig(countryCode);

          setLocation({
            latitude,
            longitude,
            formattedAddress: data.display_name || "Current Location",
            country: data.address?.country,
            countryCode,
          });

          setCurrencyCode(currency.currencyCode);
          setCurrencySymbol(currency.currencySymbol);
          setCurrencyLocale(currency.locale);
          setCurrencyRate(currency.rate);

          setCity(
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "Your Location"
          );
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setLocation({ latitude, longitude, formattedAddress: "Current Location" });
          setCity("Failed to parse city");
        } finally {
          setLoadingLocation(false);
        }
      },
      (geoError) => {
        console.warn("User denied geolocation access:", geoError);
        setCity("Location Denied");
        setLoadingLocation(false);
      }
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        city,
        cart,
        fetchCart,
        quauntity,
        subTotal,
        logout,
        currencyCode,
        currencySymbol,
        currencyLocale,
        formatCurrency: (amount: number) =>
          formatCurrencyValue(amount * currencyRate, currencyCode, currencyLocale),
      }}
    >
      {children}
      <Toaster />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};