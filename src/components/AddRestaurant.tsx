import { useState } from "react";
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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [formattedAddress, setFormattedAddress] = useState("");

  const { loadingLocation, location } = useAppData();

  const handleSubmit = async () => {
    const finalLatitude = useManualLocation ? parseFloat(latitude) : location?.latitude;
    const finalLongitude = useManualLocation ? parseFloat(longitude) : location?.longitude;
    const finalAddress = useManualLocation ? formattedAddress : location?.formattedAddress;

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
                <input
                  type="number"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  step="0.0001"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  step="0.0001"
                />
                <input
                  type="text"
                  placeholder="Address (e.g., Downtown NYC, New York, NY)"
                  value={formattedAddress}
                  onChange={(e) => setFormattedAddress(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                />
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
