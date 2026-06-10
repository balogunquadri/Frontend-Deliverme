import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../main";
import L from "leaflet";
import { LuLocateFixed, LuSearch } from "react-icons/lu";
import { BiLoader, BiPlus, BiTrash } from "react-icons/bi";

// 🔧 Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

interface OsmSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// 📍 Click-to-select location on map
const LocationPicker = ({
  setLocation,
}: {
  setLocation: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// 🔄 Helper component to re-center map dynamically when coordinates update
const ChangeMapView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// 🎯 Locate me button
const LocateMeButton = ({
  onLocate,
}: {
  onLocate: (lat: number, lng: number) => void;
}) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16, { animate: true });
        onLocate(latitude, longitude);
        toast.success("Located your current position!");
      },
      () => toast.error("Location permission denied. Please allow location access.")
    );
  };
  return (
    <button
      type="button"
      onClick={locateUser}
      className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow hover:bg-gray-100 transition"
    >
      <LuLocateFixed size={16} />
      Use current location
    </button>
  );
};

const AddAddressPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCheckout = useMemo(
    () => new URLSearchParams(location.search).get("source") === "checkout",
    [location.search]
  );

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 📋 Form state
  const [mobile, setMobile] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // 🔍 Address Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<OsmSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Default map position (e.g., New Delhi)
  const defaultCenter: [number, number] = [28.6139, 77.209];
  const currentCenter: [number, number] =
    latitude && longitude ? [latitude, longitude] : defaultCenter;

  // 🌍 Reverse Geocoding (Map click -> Address text)
  const fetchFormattedAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const addr = data.display_name || "Unknown Location";
      setFormattedAddress(addr);
      setSearchQuery(addr); // Sync search bar text with marker location
      toast.success("Location updated from map");
    } catch {
      toast.error("Failed to fetch address details for this coordinate");
    }
  };

  // 🔍 Forward Geocoding (Typed Text -> Dropdown Suggestions)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    // Debounce API calls by 500ms to avoid flooding Nominatim API
    const delayDebounce = setTimeout(async () => {
      // If user selected an exact address match, skip querying again
      if (searchQuery === formattedAddress) return;

      setSearching(true);
      try {
        // Create AbortController with 10-second timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5`,
          { signal: controller.signal }
        );

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setSuggestions(data);

        // Alert if query returned absolutely no results
        if (data.length === 0) {
          toast.error("No locations found matching that text");
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          toast.error("Address search timed out. Please try again.");
        } else {
          console.warn("Address search error:", err);
          toast.error("Address search service is temporarily unavailable");
        }
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, formattedAddress]);

  const setLocationFromMap = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    fetchFormattedAddress(lat, lng);
  };

  const handleSelectSuggestion = (suggestion: OsmSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    setLatitude(lat);
    setLongitude(lng);
    setFormattedAddress(suggestion.display_name);
    setSearchQuery(suggestion.display_name);
    setSuggestions([]); // Clear dropdown items
    toast.success("Location selected successfully!");
  };

  // 📡 Fetch user's saved addresses
  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/address/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setAddresses(data || []);
    } catch {
      toast.error("Failed to load your saved addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // ➕ Save Address
  const addAddress = async () => {
    if (!mobile || !formattedAddress || latitude === null || longitude === null) {
      toast.error("Please pick a location and enter your mobile number");
      return;
    }
    try {
      setAdding(true);
      await axios.post(
        `${restaurantService}/api/address/new`,
        {
          formattedAddress,
          mobile,
          latitude,
          longitude,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Address saved successfully");
      setMobile("");
      setFormattedAddress("");
      setSearchQuery("");
      setLatitude(null);
      setLongitude(null);
      await fetchAddresses();

      if (fromCheckout) {
        navigate("/checkout", { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save address");
    } finally {
      setAdding(false);
    }
  };

  // 🗑 Delete Address
  const deleteAddress = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${restaurantService}/api/address/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Address removed successfully");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Select Delivery Address</h1>

      {/* 🏷️ Autocomplete Search Input */}
      <div className="relative z-[1001] space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          Search Address / Landmark
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Type your address (e.g. Central Park, New York)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition shadow-sm"
          />
          <LuSearch className="absolute left-3 top-3.5 text-gray-400" size={18} />
          {searching && (
            <BiLoader className="absolute right-3 top-3.5 animate-spin text-blue-500" size={18} />
          )}
        </div>

        {/* Dropdown Suggestions List */}
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
            {suggestions.map((suggestion) => (
              <li key={suggestion.place_id}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 transition block overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  📍 {suggestion.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🗺 Map */}
      <div className="relative h-96 w-full overflow-hidden rounded-lg border shadow-sm z-0">
        <MapContainer
          center={currentCenter}
          zoom={13}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationPicker setLocation={setLocationFromMap} />
          <LocateMeButton onLocate={setLocationFromMap} />
          <ChangeMapView center={currentCenter} />
          {latitude && longitude && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>

      {/* 📍 Selected Address Alert box */}
      {formattedAddress && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="font-semibold">Confirmed Address:</span> {formattedAddress}
        </div>
      )}

      {/* 📱 Mobile Input & Save Button */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Contact Number
          </label>
          <input
            type="tel"
            placeholder="Mobile number for delivery"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition shadow-sm"
          />
        </div>

        <button
          disabled={adding}
          onClick={addAddress}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition"
        >
          {adding ? <BiLoader className="animate-spin" size={18} /> : <BiPlus size={18} />}
          Save Address
        </button>
      </div>

      {/* 📋 Saved Addresses Display */}
      <div className="space-y-3 pt-4 border-t">
        <h2 className="text-lg font-semibold text-gray-800">Saved Addresses</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BiLoader className="animate-spin" /> Loading addresses...
          </div>
        ) : addresses.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">No addresses saved yet.</p>
            {fromCheckout && (
              <p className="text-sm text-yellow-700">
                Add your first delivery address to continue to checkout.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm hover:shadow transition"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800">
                    {addr.formattedAddress}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span>📞</span> {addr.mobile}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAddress(addr._id)}
                  disabled={deletingId === addr._id}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50 transition ml-4"
                  title="Delete address"
                >
                  {deletingId === addr._id ? (
                    <BiLoader size={18} className="animate-spin" />
                  ) : (
                    <BiTrash size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {fromCheckout && addresses.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="w-full rounded-lg bg-[#373ae2] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Continue to Checkout
          </button>
        )}
      </div>
    </div>
  );
};

export default AddAddressPage;