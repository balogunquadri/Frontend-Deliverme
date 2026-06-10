import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios'; // 🎯 Added Axios for async HTTP pipeline
import { LuSearch, LuMapPin } from 'react-icons/lu';
import { BiLoader } from 'react-icons/bi';
import EmployeeImg from "../assets/SAVEEMPLOYEE.jpg";
import ChefImg from "../assets/CHEFPREPAPARINGFOOD.jpg";
import CourierImg from "../assets/COURIER.jpg";
import { restaurantService } from "../main"; // Ensure this matches your project configuration paths
import RestaurantCard from "../components/RestaurantCard";

interface OsmSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface IRestaurant {
  _id: string;
  name: string;
  image: string;
  isOpen: boolean;
  autoLocation: {
    coordinates: [number, number];
  };
}

const Homepage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<OsmSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedAddress, setSelectedAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchResults, setSearchResults] = useState<IRestaurant[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestedLocations, setSuggestedLocations] = useState<{
    displayName: string;
    lat: number | null;
    lng: number | null;
    count?: number;
  }[]>([]);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (searchQuery === selectedAddress) return;

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

        if (data.length === 0) {
          toast.error("No locations found matching that text", { id: "geo-err" });
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          toast.error("Address lookup timed out. Please try again.", { id: "geo-timeout" });
        } else {
          console.warn("Address search error:", err);
          toast.error("Address lookup service is temporarily unavailable", { id: "geo-fail" });
        }
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedAddress]);

  const handleSelectSuggestion = (suggestion: OsmSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    setCoords({ lat, lng });
    setSelectedAddress(suggestion.display_name);
    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
    
    toast.success("Delivery location locked!", { id: "geo-success" });
  };

  // 🚀 🎯 CRITICAL FIX: The Search verification handler function updated
  const handleFinalSearch = async () => {
    if (!coords || !selectedAddress) {
      toast.error("Please pick a valid address from the dropdown suggestions first");
      return;
    }
    
    const loadId = toast.loading("Checking for restaurants near your location...", { id: "search-loading" });
    
    try {
      // Dispatch availability query to your backend layout utilizing coordinates data
      const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
        params: {
          latitude: coords.lat,
          longitude: coords.lng,
          radiusInKm: 5
        }
      });

      toast.dismiss(loadId);
      toast.success(`Found ${data.count} restaurants near you!`);

      setSearchResults(data.restaurants);
      setHasSearched(true);

    } catch (error: any) {
      toast.dismiss(loadId);
      setHasSearched(true);
      setSearchResults([]);
      // 🛑 Catch the explicit database empty response mapping pattern configuration
      if (error.response && error.response.status === 404) {
        const data = error.response.data || {};
        toast.error(data.message || "We don't have any matching operational partners here yet!", {
          duration: 5000,
          id: "no-nearby-restaurants",
        });

        if (Array.isArray(data.suggestedLocations) && data.suggestedLocations.length > 0) {
          setSuggestedLocations(data.suggestedLocations);
        }
      } else {
        toast.error(error.response?.data?.message || "Problem processing geographic availability request");
        console.error(error);
      }
    }
  };

  // Run the same availability query using explicit coordinates (avoids waiting for state updates)
  const searchAtCoordinates = async (lat: number, lng: number, address?: string) => {
    const loadId = toast.loading("Checking for restaurants near your location...", { id: "search-loading" });
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
        params: {
          latitude: lat,
          longitude: lng,
          radiusInKm: 5,
        },
      });

      toast.dismiss(loadId);
      toast.success(`Found ${data.count} restaurants near you!`);

      setSearchResults(data.restaurants);
      setHasSearched(true);
      if (address) setSelectedAddress(address);
      setSuggestedLocations([]);
    } catch (error: any) {
      toast.dismiss(loadId);
      setHasSearched(true);
      setSearchResults([]);

      if (error.response && error.response.status === 404) {
        const data = error.response.data || {};
        toast.error(data.message || "We don't have any matching operational partners here yet.", {
          duration: 5000,
          id: "no-nearby-restaurants",
        });

        if (Array.isArray(data.suggestedLocations) && data.suggestedLocations.length > 0) {
          setSuggestedLocations(data.suggestedLocations);
        }
      } else {
        toast.error(error.response?.data?.message || "Problem processing geographic availability request");
        console.error(error);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-white text-left">

      {/* ========================================== */}
      {/* 1. HERO SECTION                            */}
      {/* ========================================== */}
      <div className="w-full bg-gray-50/50 py-20 border-b border-gray-100 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-5xl mx-auto space-y-6 text-center md:text-left">
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 mb-2">
            Order food to your doorstep
          </h1>
          <p className="text-gray-600 text-base max-w-xl font-medium">
            Find the best restaurants, corporate catering solutions, and couriers near you.
          </p>

          {/* Search & Input Bar Assembly */}
          <div className="flex flex-col md:flex-row items-stretch gap-3 w-full relative pt-2">
            
            {/* Address Input Wrapper with Absolute Dropdown */}
            <div className="relative flex-1 z-[100]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <LuMapPin className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter delivery address" 
                className="w-full bg-white text-black font-medium pl-12 pr-10 py-4 focus:outline-none shadow-sm text-base rounded-xl border border-gray-200 transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              {searching && (
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <BiLoader className="animate-spin text-blue-600 h-5 w-5" />
                </div>
              )}

              {/* Absolute Dropdown Overlay */}
              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 text-left z-[200]">
                  {suggestions.map((item) => (
                    <li key={item.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 transition block overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        📍 {item.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Timing Dropdown */}
            <div className="relative min-w-[180px] z-10">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <select className="w-full bg-white text-black font-semibold pl-12 pr-10 py-4 appearance-none focus:outline-none shadow-sm text-base rounded-xl cursor-pointer border border-gray-200 transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
                <option>Deliver now</option>
                <option>Schedule for later</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Search Button */}
            <button 
              onClick={handleFinalSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 text-base transition duration-200 rounded-xl whitespace-nowrap shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <LuSearch size={18} />
              Search here
            </button>

          </div>
        </div>
      </div>

       {/* Search Results Section */}
      {hasSearched && (
        <div className="w-full bg-white px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            {searchResults.length > 0 ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">
                  Restaurants near {selectedAddress}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {searchResults.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant._id}
                      id={restaurant._id}
                      name={restaurant.name}
                      image={restaurant.image || ""}
                      distance="0"
                      isOpen={restaurant.isOpen}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No restaurants found for this location.</p>
                {suggestedLocations.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-gray-700 font-medium mb-3">Try these nearby areas:</p>
                    <div className="max-w-md mx-auto grid gap-3">
                      {suggestedLocations.map((loc) => (
                        <button
                          key={`${loc.displayName}-${loc.lat}-${loc.lng}`}
                          onClick={async () => {
                            if (loc.lat === null || loc.lng === null) return;
                            await searchAtCoordinates(loc.lat, loc.lng, loc.displayName);
                          }}
                          className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 bg-white hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{loc.displayName}</div>
                              <div className="text-xs text-gray-500">{loc.count ? `${loc.count} restaurants` : "Suggested area"}</div>
                            </div>
                            <div className="text-xs text-gray-400">Search here</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mt-3">Please try a different location or broaden your search radius.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
 
      {/* ========================================== */}
      {/* MAIN LAYOUT SECTIONS                       */}
      {/* ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        
        {/* 2. B2B / PARTNERSHIP CARDS SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 text-left">
          
          {/* Card 1 */}
          <div className="flex flex-col group">
            <div className="overflow-hidden mb-4 aspect-[4/3] w-full bg-gray-100 rounded-xl border border-gray-100 shadow-sm">
              <img src={EmployeeImg} alt="Person eating lunch while working" className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.01]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Feed your employees</h2>
            <a href="/login" className="text-gray-800 underline underline-offset-4 decoration-gray-300 font-semibold hover:text-blue-600 hover:decoration-blue-600 text-sm self-start transition-colors">
              Create a business account
            </a>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col group">
            <div className="overflow-hidden mb-4 aspect-[4/3] w-full bg-gray-100 rounded-xl border border-gray-100 shadow-sm">
              <img src={ChefImg} alt="Chef preparing food in pan" className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.01]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Your restaurant, delivered</h2>
            <a href="/login" className="text-gray-800 underline underline-offset-4 decoration-gray-300 font-semibold hover:text-blue-600 hover:decoration-blue-600 text-sm self-start transition-colors">
              Add your restaurant
            </a>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col group">
            <div className="overflow-hidden mb-4 aspect-[4/3] w-full bg-gray-100 rounded-xl border border-gray-100 shadow-sm">
              <img src={CourierImg} alt="Courier on a bicycle" className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.01]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Send a courier</h2>
            <a href="/courier" className="text-gray-800 underline underline-offset-4 decoration-gray-300 font-semibold hover:text-blue-600 hover:decoration-blue-600 text-sm self-start transition-colors">
              Book a courier now
            </a>
          </div>

        </section>

        <hr className="border-gray-200 mb-16" />

        {/* 3. COUNTRIES LISTING SECTION */}
        <section className="text-left">
          <div className="flex justify-between items-baseline mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Countries with DeliverMe</h2>
            <a href="#" className="text-gray-800 underline underline-offset-4 font-semibold hover:text-blue-600 transition-colors text-sm">View all countries</a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-8 text-base text-gray-600 font-medium">
            <div>Argentina</div><div>El Salvador</div><div>Luxembourg</div><div>Spain</div>
            <div>Australia</div><div>Finland</div><div>Mexico</div><div>Sri Lanka</div>
            <div>Belgium</div><div>France</div><div>Netherlands</div><div>Sweden</div>
            <div>Canada</div><div>Germany</div><div>New Zealand</div><div>Switzerland</div>
            <div>Chile</div><div>Guatemala</div><div>Norway</div><div>Taiwan (ROC)</div>
            <div>Costa Rica</div><div>Ireland</div><div>Panama</div><div>United Kingdom</div>
            <div>Denmark</div><div>Italy</div><div>Poland</div><div>United States</div>
            <div>Dominican Republic</div><div>Japan</div><div>Portugal</div><div></div>
            <div>Ecuador</div><div>Kenya</div><div>South Africa</div><div></div>
          </div>
        </section>

      </main>

     

    </div>
  );
};

export default Homepage;