import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant, AddressData } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Address extends AddressData {}

const Checkout = () => {
  const { cart, subTotal, quauntity, currencyCode, formatCurrency, isAuth, user } = useAppData();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setselectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [fetchingRestaurant, setFetchingRestaurant] = useState(false);

  const [discountCode, setDiscountCode] = useState("");

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

  const getDistanceBasedDeliveryFee = (distanceKm: number) => {
    if (subTotal >= 250) return 0;
    const baseFee = 25;
    const distanceFee = Math.round(distanceKm * 8);
    return Math.max(baseFee, distanceFee);
  };

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const deliveryDistance = useMemo(() => {
    if (!selectedAddress || !restaurant?.autoLocation?.coordinates) return null;
    const [restaurantLng, restaurantLat] = restaurant.autoLocation.coordinates;
    const [addressLng, addressLat] = selectedAddress.location.coordinates;
    return getDistanceKm(restaurantLat, restaurantLng, addressLat, addressLng);
  }, [selectedAddress, restaurant]);

  const baseDeliveryFee = useMemo(() => {
    if (deliveryDistance === null) {
      return subTotal < 250 ? 49 : 0;
    }
    return getDistanceBasedDeliveryFee(deliveryDistance);
  }, [deliveryDistance, subTotal]);

  const applyDiscounts = (
    baseDeliveryFee: number,
    baseTotal: number
  ) => {
    let discount = 0;
    let deliveryFeeAfterDiscount = baseDeliveryFee;

    if (discountCode.trim() === "") {
      return { fee: deliveryFeeAfterDiscount, discount };
    }

    try {
      const stored = localStorage.getItem("discountCodes");
      if (stored) {
        const codes = JSON.parse(stored) as any[];
        const found = codes.find((c) => c.code === discountCode);
        if (found) {
          if (found.type === "freeDelivery") {
            discount = baseDeliveryFee;
            deliveryFeeAfterDiscount = 0;
          } else if (found.type === "percentage") {
            discount = Math.round((found.value / 100) * baseTotal);
          } else if (found.type === "fixed") {
            discount = found.value;
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }

    const cappedDiscount = Math.min(discount, baseTotal);
    return {
      fee: deliveryFeeAfterDiscount,
      discount: Math.max(0, cappedDiscount),
    };
  };

  const selectedDeliveryResult = useMemo(() => {
    const baseTotal = subTotal + baseDeliveryFee + 7;
    return applyDiscounts(baseDeliveryFee, baseTotal);
  }, [baseDeliveryFee, discountCode, subTotal]);

  const totalAfterDiscount = Math.max(
    0,
    subTotal + selectedDeliveryResult.fee + 7 - selectedDeliveryResult.discount
  );

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0 || !isAuth) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(
          `${restaurantService}/api/address/all`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const addressList = data || [];
        setAddresses(addressList);

        if (!selectedAddressId && addressList.length === 1) {
          setselectedAddressId(addressList[0]._id);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
    // restore pending order if any (post-login flow)
    try {
      const pendingRaw = localStorage.getItem("pendingOrder");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending.selectedAddressId) setselectedAddressId(pending.selectedAddressId);
        if (pending.discountCode) setDiscountCode(pending.discountCode);
        localStorage.removeItem("pendingOrder");
      }
    } catch (err) {
      // ignore
    }
  }, [cart, isAuth]);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuth && !loadingAddress && addresses.length === 0) {
      navigate("/address?source=checkout");
    }
  }, [addresses.length, isAuth, loadingAddress, navigate]);

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
      <div className="flex min-h-[60vh] item-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  if (fetchingRestaurant || !restaurant) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Loading checkout...</p>
      </div>
    );
  }

  const platformFee = 7;

  const createOrder = async (paymentMethod: "razorpay" | "stripe") => {
    if (!selectedAddressId) return null;

    // If user is not authenticated, save pending order and redirect to login
    if (!isAuth) {
      const pending = { cart, selectedAddressId, discountCode };
      localStorage.setItem("pendingOrder", JSON.stringify(pending));
      localStorage.setItem("postLoginRedirect", "/checkout");
      navigate(`/login`);
      return null;
    }

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        {
          paymentMethod,
          addressId: selectedAddressId,
          localCurrency: currencyCode,
          discountCode: discountCode || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // If FreeDelivery used, mark user as having ordered for future checks
      if (discountCode === "FreeDelivery") {
        if (user) {
          localStorage.setItem(`hasOrderedBefore_${user._id}`, "true");
        } else {
          localStorage.setItem("hasOrderedBefore_guest", "true");
        }
      }

      return data;
    } catch (error) {
      toast.error("Failed to create Order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const payWithRazorpay = async () => {
    try {
      setLoadingRazorpay(true);

      const order = await createOrder("razorpay");
      if (!order) return;

      const { orderId, amount } = order;

      const { data } = await axios.post(`${utilsService}/api/payment/create`, {
        orderId,
        currency: currencyCode,
      });

      const { razorpayOrderId, key } = data;

      const options = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "Deliverme", //your business name
        description: "Food Order Payment",
        order_id: razorpayOrderId,

        handler: async (response: any) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });

            toast.success("Payment successfull 🎉");
            navigate("/paymentsuccess/" + response.razorpay_payment_id);
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        theme: {
          color: "#373ae2",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.log(error);
      toast.error("Payment Failed please refresh page");
    } finally {
      setLoadingRazorpay(false);
    }
  };

  const payWithStripe = async () => {
    try {
      setLoadingStripe(true);
      const order = await createOrder("stripe");
      if (!order) return;

      const { orderId } = order;

      try {
        await stripePromise;

        const { data } = await axios.post(
          `${utilsService}/api/payment/stripe/create`,
          {
            orderId,
            currency: currencyCode,
          }
        );

        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error("failed to create payment session");
        }
      } catch (error) {
        toast.error("Payment Failed");
      }
    } catch (error) {
      console.log(error);
      toast.error("Payment failed");
    } finally {
      setLoadingStripe(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {!isAuth && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 shadow-sm">
          <p className="font-medium">Login or sign up to complete your order.</p>
          <p className="mt-1 text-sm text-yellow-700">
            Delivery address selection and checkout are available only after authentication.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => {
                localStorage.setItem("postLoginRedirect", "/checkout");
                navigate("/login");
              }}
              className="rounded-lg bg-[#373ae2] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Login
            </button>
            <button
              onClick={() => {
                localStorage.setItem("postLoginRedirect", "/checkout");
                navigate("/login", { state: { authMode: "signup" } });
              }}
              className="rounded-lg border border-[#373ae2] bg-white px-4 py-2 text-sm font-semibold text-[#373ae2] hover:bg-blue-50"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{restaurant.name}</h2>
        <p className="text-sm text-gray-500">
          {restaurant.autoLocation?.formattedAddress || "Location unavailable"}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Delivery Address</h3>

        {loadingAddress ? (
          <p className="text-sm text-gray-500">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            No address found. Please add one
          </p>
        ) : (
          addresses.map((add) => (
            <label
              key={add._id}
              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selectedAddressId === add._id
                  ? "border-[#373ae2] bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                checked={selectedAddressId === add._id}
                onChange={() => setselectedAddressId(add._id)}
              />
              <div>
                <p className="text-sm font-medium">{add.formattedAddress}</p>
                <p className="text-xs text-gray-500">{add.mobile}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-4">
        <h3 className="font-semibold">Order Summary</h3>

        {cart.map((cartItem: ICart) => {
          const item = cartItem.itemId as IMenuItem;

          return (
            <div className="flex justify-between text-sm" key={cartItem._id}>
              <span>
                {item.name} x {cartItem.quauntity}
              </span>
              <span>{formatCurrency(item.price * cartItem.quauntity)}</span>
            </div>
          );
        })}

        <hr />

        <div className="flex justify-between text-sm">
          <span>Items ({quauntity})</span>
          <span>{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>
            {selectedDeliveryResult.fee === 0
              ? "Free"
              : formatCurrency(selectedDeliveryResult.fee)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatForm Fee</span>
          <span>{formatCurrency(platformFee)}</span>
        </div>
        {deliveryDistance !== null && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Delivery distance</span>
            <span>{deliveryDistance.toFixed(2)} km</span>
          </div>
        )}

        {subTotal < 250 && (
          <p className="text-xs text-gray-500">
            Add Item worth {formatCurrency(250 - subTotal)} more to get free delivery.
          </p>
        )}

        {selectedDeliveryResult.discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(selectedDeliveryResult.discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>{formatCurrency(totalAfterDiscount)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Discount / Promo Code</h3>
        <div className="flex gap-2">
          <input
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="flex-1 rounded border p-2"
            placeholder='Enter promo (e.g. "FreeDelivery")'
          />
          <button
            onClick={() => {
              const res = selectedDeliveryResult;
              if (res.discount > 0) {
                toast.success("Discount applied");
              } else {
                toast.error("Invalid or ineligible promo code");
              }
            }}
            className="rounded bg-gray-800 px-4 py-2 text-white"
          >
            Apply
          </button>
        </div>
        {selectedDeliveryResult.discount > 0 && (
          <p className="text-sm text-green-600">
            Discount applied: {formatCurrency(selectedDeliveryResult.discount)}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Payment Method</h3>

        {!selectedAddressId && !loadingAddress && (
          <p className="text-sm text-yellow-600">
            {addresses.length === 0
              ? "Add a delivery address to enable payment."
              : "Select delivery address to enable payment."}
          </p>
        )}

        <button
          disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
          onClick={payWithRazorpay}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D7FF9] py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loadingRazorpay ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}
          Pay With Razorpay
        </button>

        <button
          disabled={!selectedAddressId || loadingStripe || creatingOrder}
          onClick={payWithStripe}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loadingStripe ? (
            <BiLoader size={18} className="animate-spin" />
          ) : (
            <BiCreditCard size={18} />
          )}
          Pay With Stripe
        </button>
      </div>
    </div>
  );
};

export default Checkout;
