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

type AppContextValue =
  AppContextType &
  {
    logout: () => void;
    addToCart: (restaurantId: string, itemId: string, itemObj?: any) => Promise<void>;
    incItem: (itemId: string) => Promise<void>;
    decItem: (itemId: string) => Promise<void>;
    clearCartLocal: () => Promise<void>;
  };
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

  // Guest/local cart handling
  useEffect(() => {
    try {
      const stored = localStorage.getItem("guestCart");
      if (stored) {
        const parsed = JSON.parse(stored) as ICart[];
        if (parsed && parsed.length > 0) {
          setCart(parsed);
          let subtotal = 0;
          let cartLength = 0;
          for (const ci of parsed) {
            const item: any = ci.itemId;
            subtotal += item.price * ci.quauntity;
            cartLength += ci.quauntity;
          }
          setSubTotal(subtotal);
          setQuauntity(cartLength);
        }
      }
    } catch (err) {
      console.warn("Failed to load guest cart", err);
    }
  }, []);

  const saveGuestCart = (newCart: ICart[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("guestCart", JSON.stringify(newCart));
    } catch (err) {
      console.warn("Failed saving guest cart", err);
    }

    let subtotal = 0;
    let cartLength = 0;
    for (const ci of newCart) {
      const item: any = ci.itemId;
      subtotal += item.price * ci.quauntity;
      cartLength += ci.quauntity;
    }
    setSubTotal(subtotal);
    setQuauntity(cartLength);
  };

  const addToCartLocalOrRemote = async (restaurantId: string, itemId: string, itemObj?: any) => {
    // If authenticated customer, add via API
    if (user && user.role === "customer") {
      try {
        await axios.post(`${restaurantService}/api/cart/add`, { restaurantId, itemId }, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        await fetchCart();
        return;
      } catch (err) {
        console.warn("Failed to add remote cart item", err);
      }
    }

    // Local guest cart
    const existing = cart.find((c) => (c.itemId as any)._id === itemId || c.itemId === itemId);
    let newCart = [...cart];
    if (existing) {
      newCart = newCart.map((c) => {
        if ((c.itemId as any)._id === itemId || c.itemId === itemId) {
          return { ...c, quauntity: c.quauntity + 1 };
        }
        return c;
      });
    } else {
      newCart.push({
        _id: `${Date.now()}-${itemId}`,
        userId: "",
        restaurantId,
        itemId: itemObj || itemId,
        quauntity: 1,
        cretedAt: new Date(),
        updatedAt: new Date(),
      } as ICart);
    }

    saveGuestCart(newCart);
  };

  const incLocalOrRemote = async (itemId: string) => {
    if (user && user.role === "customer") {
      try {
        await axios.put(`${restaurantService}/api/cart/inc`, { itemId }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        await fetchCart();
        return;
      } catch (err) {
        console.warn(err);
      }
    }

    const newCart = cart.map((c) => {
      if ((c.itemId as any)._id === itemId || c.itemId === itemId) {
        return { ...c, quauntity: c.quauntity + 1 };
      }
      return c;
    });

    saveGuestCart(newCart);
  };

  const decLocalOrRemote = async (itemId: string) => {
    if (user && user.role === "customer") {
      try {
        await axios.put(`${restaurantService}/api/cart/dec`, { itemId }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        await fetchCart();
        return;
      } catch (err) {
        console.warn(err);
      }
    }

    let newCart = cart.map((c) => {
      if ((c.itemId as any)._id === itemId || c.itemId === itemId) {
        return { ...c, quauntity: c.quauntity - 1 };
      }
      return c;
    }).filter((c) => c.quauntity > 0);

    saveGuestCart(newCart);
  };

  const clearLocalOrRemote = async () => {
    if (user && user.role === "customer") {
      try {
        await axios.delete(`${restaurantService}/api/cart/clear`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        await fetchCart();
        return;
      } catch (err) {
        console.warn(err);
      }
    }

    localStorage.removeItem("guestCart");
    setCart([]);
    setSubTotal(0);
    setQuauntity(0);
  };

  // When a user logs in, try to migrate any guest cart to server
  useEffect(() => {
    const tryMigrate = async () => {
      if (user && user.role === "customer") {
        const stored = localStorage.getItem("guestCart");
        if (!stored) return;
        try {
          const parsed = JSON.parse(stored) as ICart[];
          for (const ci of parsed) {
            const itemId = (ci.itemId as any)._id || ci.itemId;
            const restaurantId = ci.restaurantId as any._id || ci.restaurantId;
            try {
              await axios.post(`${restaurantService}/api/cart/add`, { restaurantId, itemId }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            } catch (err) {
              console.warn("Failed migrating item", itemId, err);
            }
          }
          localStorage.removeItem("guestCart");
          await fetchCart();
        } catch (err) {
          console.warn("Failed migrating guest cart", err);
        }
      }
    };

    tryMigrate();
  }, [user]);

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
        addToCart: addToCartLocalOrRemote,
        incItem: incLocalOrRemote,
        decItem: decLocalOrRemote,
        clearCartLocal: clearLocalOrRemote,
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