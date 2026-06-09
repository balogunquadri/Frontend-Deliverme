import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../main";
import { BiMapPin, BiUpload } from "react-icons/bi";

interface props {
  fetchMyRestaurant: () => Promise<void>;
}

const AddRestaurant = ({ fetchMyRestaurant }: props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");

  const { loadingLocation, location } = useAppData();

  useEffect(() => {
    if (addressSearch.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            addressSearch
          )}&limit=5`
        );
        const data = await res.json();
        setAddressSuggestions(data || []);
      } catch (error) {
        console.error("Address search error:", error);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [addressSearch]);

  const handleAddressSelect = (locationData: any) => {
    const lat = locationData.lat;
    const lon = locationData.lon;

    setFormattedAddress(locationData.display_name);
    setLatitude(lat);
    setLongitude(lon);
    setAddressSearch(locationData.display_name);
    setAddressSuggestions([]);
  };

  const geocodeAddress = async (query: string) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data[0]) {
        return data[0];
      }
    } catch (error) {
      console.error("Geocode error:", error);
    }
    return null;
  };

  const handleSubmit = async () => {
    let finalLatitude = useManualLocation ? parseFloat(latitude) : location?.latitude;
    let finalLongitude = useManualLocation ? parseFloat(longitude) : location?.longitude;
    let finalAddress = useManualLocation ? formattedAddress : location?.formattedAddress;

    if (useManualLocation && !finalLatitude && !finalLongitude && addressSearch) {
      const geocode = await geocodeAddress(addressSearch);
      if (geocode) {
        finalLatitude = parseFloat(geocode.lat);
        finalLongitude = parseFloat(geocode.lon);
        finalAddress = geocode.display_name;
      }
    }

    if (!name || !image) {
      alert("Name and image are required");
      return;
    }

    if (!finalLatitude || !finalLongitude || !finalAddress) {
      alert("Location is required");
      return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("description", description);
    formData.append("latitude", String(finalLatitude));
    formData.append("longitude", String(finalLongitude));
    formData.append("formattedAddress", finalAddress);
    formData.append("file", image);
    formData.append("phone", phone);

    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Restaurant Added successfully");
      fetchMyRestaurant();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-sm space-y-5">
        <h1 className="text-xl font-semibold">Add Your Restaurant</h1>
        <input
          type="text"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />
        <input
          type="number"
          placeholder="Contact Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />
        <textarea
          placeholder="Restaurant Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none"
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm text-gray-600 hover:bg-gray-50">
          <BiUpload className="h-5 w-5 text-blue-500" />
          {image ? image.name : "Upload restaurant image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>

        <div className="flex items-start gap-3 rounded-lg boder p-4">
          <BiMapPin className="mt-0.5 h-5 w-5 text-blue-500" />
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Location</label>
              <button
                type="button"
                onClick={() => {
                  setUseManualLocation(!useManualLocation);
                  setLatitude("");
                  setLongitude("");
                  setFormattedAddress("");
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                {useManualLocation ? "Use Auto-detect" : "Enter Manually"}
              </button>
            </div>
            {useManualLocation ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter address"
                    value={addressSearch}
                    onChange={(e) => {
                      setAddressSearch(e.target.value);
                      setFormattedAddress("");
                      setLatitude("");
                      setLongitude("");
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  />
                  {addressSuggestions.length > 0 && (
                    <ul className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                      {addressSuggestions.map((item) => (
                        <li key={item.place_id}>
                          <button
                            type="button"
                            onClick={() => handleAddressSelect(item)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {item.display_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {formattedAddress && (
                    <div className="space-y-2">
                      <div className="rounded-lg border bg-slate-50 p-3 text-sm text-gray-700">
                        <div className="font-medium">Selected address</div>
                        <div>{formattedAddress}</div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm text-gray-700">
                          <div className="font-medium">Latitude</div>
                          <div>{latitude}</div>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-3 text-sm text-gray-700">
                          <div className="font-medium">Longitude</div>
                          <div>{longitude}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {latitude && longitude && (
                    <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                      <MapContainer
                        center={[parseFloat(latitude), parseFloat(longitude)]}
                        zoom={14}
                        scrollWheelZoom={false}
                        className="h-full w-full"
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[parseFloat(latitude), parseFloat(longitude)]}>
                          <Popup>{formattedAddress}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {loadingLocation
                  ? "Fetching your location..."
                  : location?.formattedAddress || "Location not available"}
              </div>
            )}
          </div>
        </div>

        <button
          className="w-full rounded-lg py-3 text-sm font-semibold text-white bg-[#373ae2]"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting..." : "Add Restaurant"}
        </button>
      </div>
    </div>
  );
};

export default AddRestaurant;
