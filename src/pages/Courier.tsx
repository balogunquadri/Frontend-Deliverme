import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LuMapPin } from 'react-icons/lu';
import { BiLoader } from 'react-icons/bi';
import { useAppData } from "../context/AppContext";

const packageTypes = [
  { value: "food", label: "Food" },
  { value: "document", label: "Document" },
  { value: "electronics", label: "Electronics" },
  { value: "household", label: "Household Item" },
  { value: "fashion", label: "Fashion" },
  { value: "other", label: "Other" },
];

const BASE_FEE = 5;
const DISTANCE_INCREMENT = 1.5;
const WEIGHT_INCREMENT = 2.0;

const toMiles = (meters: number) => meters / 1609.34;

const getDistanceMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return toMiles(meters);
};

const courierFee = (distance: number, weight: number) => {
  let fee = BASE_FEE;
  if (distance > 5) {
    fee += (distance - 5) * DISTANCE_INCREMENT;
  }
  if (weight > 5) {
    fee += (weight - 5) * WEIGHT_INCREMENT;
  }
  return Number(fee.toFixed(2));
};

const getMapUrl = (lat?: number, lng?: number) => {
  if (lat === undefined || lng === undefined) return "";
  const delta = 0.02;
  const minLon = lng - delta;
  const minLat = lat - delta;
  const maxLon = lng + delta;
  const maxLat = lat + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=map&marker=${lat}%2C${lng}`;
};

const Courier = () => {
  const navigate = useNavigate();
  const { user, isAuth, location } = useAppData();

  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [pickupSearching, setPickupSearching] = useState(false);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [dropoffSearching, setDropoffSearching] = useState(false);
  const [packageType, setPackageType] = useState("food");
  const [otherDescription, setOtherDescription] = useState("");
  const [packageWeight, setPackageWeight] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [autoPopulate, setAutoPopulate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (autoPopulate && user) {
      setPickupName(user.name || "");
      setPickupPhone(user.phoneNumber || "");
      if (location) {
        setPickupAddress(location.formattedAddress);
        setPickupLat(location.latitude.toString());
        setPickupLng(location.longitude.toString());
      }
    }
  }, [autoPopulate, user, location]);


  useEffect(() => {
    if (pickupAddress.length < 3) {
      setPickupSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setPickupSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupAddress)}&limit=5`
        );
        const data = await res.json();
        setPickupSuggestions(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setPickupSearching(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [pickupAddress]);

  useEffect(() => {
    if (dropoffAddress.length < 3) {
      setDropoffSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      setDropoffSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropoffAddress)}&limit=5`
        );
        const data = await res.json();
        setDropoffSuggestions(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setDropoffSearching(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [dropoffAddress]);

  const parsedPickupLat = Number(pickupLat);
  const parsedPickupLng = Number(pickupLng);
  const parsedDropoffLat = Number(dropoffLat);
  const parsedDropoffLng = Number(dropoffLng);
  const parsedWeight = Number(packageWeight);

  const pickupCoordsValid =
    pickupLat.trim() !== "" &&
    pickupLng.trim() !== "" &&
    Number.isFinite(parsedPickupLat) &&
    Number.isFinite(parsedPickupLng);

  const dropoffCoordsValid =
    dropoffLat.trim() !== "" &&
    dropoffLng.trim() !== "" &&
    Number.isFinite(parsedDropoffLat) &&
    Number.isFinite(parsedDropoffLng);

  const distanceMiles = useMemo(() => {
    if (pickupCoordsValid && dropoffCoordsValid) {
      return getDistanceMiles(
        parsedPickupLat,
        parsedPickupLng,
        parsedDropoffLat,
        parsedDropoffLng
      );
    }
    return 0;
  }, [pickupCoordsValid, dropoffCoordsValid, parsedPickupLat, parsedPickupLng, parsedDropoffLat, parsedDropoffLng]);

  const estimatedFee = useMemo(() => {
    if (!distanceMiles || !parsedWeight) return BASE_FEE;
    return courierFee(distanceMiles, parsedWeight);
  }, [distanceMiles, parsedWeight]);

  const canSubmit =
    pickupName.trim().length > 0 &&
    pickupPhone.trim().length > 0 &&
    pickupAddress.trim().length > 0 &&
    dropoffAddress.trim().length > 0 &&
    pickupCoordsValid &&
    dropoffCoordsValid &&
    parsedWeight > 0;

  const submitOrder = async () => {
    if (!isAuth) {
      toast.error("Please login as a customer or seller to order a courier");
      navigate("/login");
      return;
    }

    if (!user || (user.role !== "customer" && user.role !== "seller")) {
      toast.error("Courier orders are only available for customers and sellers.");
      return;
    }

    if (!canSubmit) {
      toast.error("Please fill in all required courier details.");
      return;
    }

    setSubmitting(true);

    const courierRequest = {
      pickup: {
        name: pickupName,
        phone: pickupPhone,
        address: pickupAddress,
        latitude: parsedPickupLat,
        longitude: parsedPickupLng,
      },
      dropoff: {
        address: dropoffAddress,
        latitude: parsedDropoffLat,
        longitude: parsedDropoffLng,
      },
      package: {
        type: packageType,
        description: packageType === "other" ? otherDescription : undefined,
        size: packageSize,
        weightKg: parsedWeight,
      },
      meta: {
        distanceMiles: Number(distanceMiles.toFixed(2)),
        estimatedFee,
      },
    };

    console.log("Courier order request:", courierRequest);
    toast.success("Courier request submitted. Confirmed estimate: $" + estimatedFee.toFixed(2));
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Courier Delivery
            </p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Book a courier pickup</h1>
            <p className="mt-2 text-gray-600">
              Place a courier order from any pickup address to dropoff address. Customers and sellers can order courier service.
            </p>
          </div>

          {!isAuth ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-blue-50 p-6 text-center">
              <p className="text-lg font-semibold text-gray-900">Login to place a courier order</p>
              <p className="mt-2 text-gray-600">
                This page is visible to everyone, but only customers and sellers can submit courier requests.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Login or Register
              </button>
            </div>
          ) : user?.role !== "customer" && user?.role !== "seller" ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-yellow-50 p-6 text-center">
              <p className="text-lg font-semibold text-gray-900">Courier service requires a customer or seller account</p>
              <p className="mt-2 text-gray-600">
                Your current account role is <strong>{user?.role}</strong>. Please switch to a customer or seller account to continue.
              </p>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] mt-8">
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Pickup details</h2>
                    <p className="text-sm text-gray-500">Manually enter the pickup address and contact information.</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={autoPopulate}
                      onChange={(e) => setAutoPopulate(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Auto populate pickup info
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-700">
                    Pickup name
                    <input
                      type="text"
                      value={pickupName}
                      onChange={(e) => setPickupName(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={autoPopulate && !!user}
                    />
                  </label>
                  <label className="space-y-2 text-sm text-gray-700">
                    Pickup phone number
                    <input
                      type="tel"
                      value={pickupPhone}
                      onChange={(e) => setPickupPhone(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={autoPopulate && !!user}
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="relative flex-1 z-[50]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <LuMapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      className="w-full bg-white text-black font-medium pl-10 pr-10 py-3 focus:outline-none shadow-sm text-sm rounded-xl border border-gray-200 transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />

                    {pickupSearching && (
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <BiLoader className="animate-spin text-blue-600 h-5 w-5" />
                      </div>
                    )}

                    {pickupSuggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 text-left z-[200]">
                        {pickupSuggestions.map((item: any, idx: number) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => {
                                const lat = Number(item.lat);
                                const lon = Number(item.lon);
                                setPickupLat(lat.toString());
                                setPickupLng(lon.toString());
                                setPickupAddress(item.display_name);
                                setPickupSuggestions([]);
                                toast.success("Pickup address locked");
                              }}
                              className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 transition block overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              📍 {item.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Dropoff details</h2>
                    <p className="text-sm text-gray-500">Enter the final delivery address for the package.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="relative flex-1 z-[50]">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <LuMapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      className="w-full bg-white text-black font-medium pl-10 pr-10 py-3 focus:outline-none shadow-sm text-sm rounded-xl border border-gray-200 transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />

                    {dropoffSearching && (
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <BiLoader className="animate-spin text-blue-600 h-5 w-5" />
                      </div>
                    )}

                    {dropoffSuggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 top-full mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 text-left z-[200]">
                        {dropoffSuggestions.map((item: any, idx: number) => (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => {
                                const lat = Number(item.lat);
                                const lon = Number(item.lon);
                                setDropoffLat(lat.toString());
                                setDropoffLng(lon.toString());
                                setDropoffAddress(item.display_name);
                                setDropoffSuggestions([]);
                                toast.success("Dropoff address locked");
                              }}
                              className="w-full text-left px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 transition block overflow-hidden text-ellipsis whitespace-nowrap"
                            >
                              📍 {item.display_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">Package details</h2>
                <p className="mt-1 text-sm text-gray-500">Choose the package type and add size or weight information.</p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-700">
                    Package type
                    <select
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {packageTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-gray-700">
                    Package weight (kg)
                    <input
                      type="number"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value)}
                      min="0"
                      step="0.1"
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="space-y-2 text-sm text-gray-700">
                    Package size / description
                    <input
                      type="text"
                      value={packageSize}
                      onChange={(e) => setPackageSize(e.target.value)}
                      placeholder="e.g. small backpack, medium box"
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </label>

                  {packageType === "other" && (
                    <label className="space-y-2 text-sm text-gray-700">
                      Describe the package
                      <textarea
                        value={otherDescription}
                        onChange={(e) => setOtherDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Estimated distance</p>
                    <p className="text-2xl font-semibold text-gray-900">{distanceMiles ? `${distanceMiles.toFixed(2)} miles` : "Enter coordinates"}</p>
                  </div>
                  <div className="rounded-3xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                    ${estimatedFee.toFixed(2)}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Flat fee applies for courier orders up to 5 miles and 5kg. Additional distance and weight are charged incrementally.
                </p>
                <button
                  onClick={submitOrder}
                  disabled={submitting || !canSubmit}
                  className="mt-3 rounded-3xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "Submitting..." : "Place courier request"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Pickup map</h2>
                {pickupLat && pickupLng ? (
                  <iframe
                    title="Pickup map"
                    src={getMapUrl(parsedPickupLat, parsedPickupLng)}
                    className="mt-4 h-64 w-full rounded-3xl border border-gray-200"
                  />
                ) : (
                  <div className="mt-4 flex h-64 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                    Enter pickup coordinates to preview the location map.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Dropoff map</h2>
                {dropoffLat && dropoffLng ? (
                  <iframe
                    title="Dropoff map"
                    src={getMapUrl(parsedDropoffLat, parsedDropoffLng)}
                    className="mt-4 h-64 w-full rounded-3xl border border-gray-200"
                  />
                ) : (
                  <div className="mt-4 flex h-64 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
                    Enter dropoff coordinates to preview the location map.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courier;
