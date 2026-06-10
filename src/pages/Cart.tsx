import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState, useEffect } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";

const Cart = () => {
  const { cart, subTotal, quauntity, formatCurrency, incItem, decItem, clearCartLocal, isAuth } = useAppData();
  const navigate = useNavigate();

  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [fetchingRestaurant, setFetchingRestaurant] = useState(false);

  // Fetch restaurant data if we only have an ID
  useEffect(() => {
    if (!cart || cart.length === 0) return;

    const restaurantData = cart[0].restaurantId;

    // If it's already a full object, use it
    if (restaurantData && typeof restaurantData === "object") {
      setRestaurant(restaurantData as IRestaurant);
      return;
    }

    // If it's just an ID string, fetch the restaurant
    if (restaurantData && typeof restaurantData === "string") {
      setFetchingRestaurant(true);
      axios
        .get(`${restaurantService}/api/restaurant/${restaurantData}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then(({ data }) => {
          setRestaurant(data);
        })
        .catch((err) => {
          console.error("Failed to fetch restaurant:", err);
          toast.error("Could not load restaurant details");
        })
        .finally(() => {
          setFetchingRestaurant(false);
        });
    }
  }, [cart]);

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  if (fetchingRestaurant || !restaurant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Loading cart...</p>
      </div>
    );
  }

  const platfromFee = 7;
  const estimatedTotal = subTotal + platfromFee;

  const increaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await incItem(itemId);
    } catch (error) {
      toast.error("something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const decreaseQty = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      await decItem(itemId);
    } catch (error) {
      toast.error("something went wrong");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    const confirm = window.confirm("Are you sure you want to clear your cart?");
    if (!confirm) return;
    try {
      setClearingCart(true);
      await clearCartLocal();
    } catch (error) {
      toast.error("something went wrong");
    } finally {
      setClearingCart(false);
    }
  };

  const checkout = () => {
    if (!isAuth) {
      localStorage.setItem("postLoginRedirect", "/address?source=checkout");
      navigate("/login");
      return;
    }

    navigate("/address?source=checkout");
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          {restaurant.autoLocation?.formattedAddress || "Location unavailable"}
        </p>
      </div>

      <div className="space-y-4">
        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;
          const isLoading = loadingItemId === item._id;

          return (
            <div
              key={item._id}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
            >
              <img
                src={item.image}
                alt=""
                className="h-20 w-20 rounded object-cover"
              />

              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => decreaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiMinus size={16} />
                  )}
                </button>
                <span className="font-medium">{cartItem.quauntity}</span>
                <button
                  className="rounded-full border p-2 hover:bg-gray-100 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => increaseQty(item._id)}
                >
                  {isLoading ? (
                    <VscLoading size={16} className="animate-spin" />
                  ) : (
                    <BiPlus size={16} />
                  )}
                </button>
              </div>

              <p className="w-20 text-right font-medium">
                {formatCurrency(item.price * cartItem.quauntity)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span>Total Items</span>
          <span>{quauntity}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span className="text-gray-500">Calculated at checkout</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatFrom fee</span>
          <span>{formatCurrency(platfromFee)}</span>
        </div>

        <p className="text-xs text-gray-500">
          Delivery fee is calculated at checkout based on the selected delivery address.
        </p>

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Estimated Total</span>
          <span>{formatCurrency(estimatedTotal)}</span>
        </div>

        <button
          onClick={checkout}
          className={`mt-3 w-full rounded-lg bg-[#373ae2] py-3 text-sm font-semibold text-white hover:bg-blue-800 ${
            !restaurant.isOpen ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!restaurant.isOpen}
        >
          {!restaurant.isOpen ? "Restaurant is Closed" : "Proceed to Checkout"}
        </button>

        <button
          onClick={clearCart}
          className="mt-3 w-full rounded-lg bg-[#232222] py-3 text-sm font-semibold text-white hover:bg-gray-900 flex justify-center items-center gap-3"
          disabled={clearingCart}
        >
          Clear Cart <TbTrash size={16} />
        </button>
      </div>
    </div>
  );
};

export default Cart;
