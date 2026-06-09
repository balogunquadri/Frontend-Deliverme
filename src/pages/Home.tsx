import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import RestaurantCard from "../components/RestaurantCard";

type SuggestedLocation = {
  displayName: string;
  lat: number | null;
  lng: number | null;
  count?: number;
};

const Home = () => {
  const { location } = useAppData();
  const [searchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  const fetchRestaurants = async () => {
    if (!location?.latitude || !location?.longitude) {
      return;
    }

    try {
      setLoading(true);
      setSuggestedLocations([]);

      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/all`,
        {
          params: {
            latitude: location.latitude,
            longitude: location.longitude,
            search,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setRestaurants(data.restaurants ?? []);
    } catch (error: any) {
      console.log(error);
      setRestaurants([]);

      if (error.response?.status === 404) {
        const data = error.response.data || {};
        if (Array.isArray(data.suggestedLocations)) {
          setSuggestedLocations(data.suggestedLocations);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const searchAtCoordinates = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      setSuggestedLocations([]);

      const { data } = await axios.get(`${restaurantService}/api/restaurant/all`, {
        params: {
          latitude: lat,
          longitude: lng,
          search,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setRestaurants(data.restaurants ?? []);
    } catch (error: any) {
      setRestaurants([]);
      if (error.response?.status === 404) {
        const data = error.response.data || {};
        if (Array.isArray(data.suggestedLocations)) {
          setSuggestedLocations(data.suggestedLocations);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [location, search]);

  if (loading || !location) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-gray-500">Finding restaurants near you...</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {restaurants.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {restaurants.map((res) => {
            const [resLng, resLat] = res.autoLocation.coordinates;

            const distance = getDistanceKm(
              location.latitude,
              location.longitude,
              resLat,
              resLng
            );

            return (
              <RestaurantCard
                key={res._id}
                id={res._id}
                name={res.name}
                image={res.image ?? ""}
                distance={`${distance}`}
                isOpen={res.isOpen}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <p className="text-lg font-semibold text-gray-700">
            No restaurants were found in your area.
          </p>
          <p className="text-sm text-gray-500">
            Try one of these nearby suggested areas instead.
          </p>

          {suggestedLocations.length > 0 ? (
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              {suggestedLocations.map((location, index) => (
                <button
                  key={`${location.displayName}-${index}`}
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"
                  onClick={() => {
                    if (location.lat && location.lng) {
                      searchAtCoordinates(location.lat, location.lng);
                    }
                  }}
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {location.displayName}
                  </div>
                  {location.count != null ? (
                    <div className="mt-1 text-xs text-gray-500">
                      {location.count} restaurants
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              We couldn&apos;t find suggestions at the moment. Try another search or refresh the page.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
