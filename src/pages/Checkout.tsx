import { useEffect, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../main";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader } from "react-icons/bi";
import { loadStripe } from "@stripe/stripe-js";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

const Checkout = () => {
  const { cart, subTotal, quauntity, currencyCode, formatCurrency, isAuth, user } = useAppData();

  const [addresses, setAddresses] = useState<Address[]>([]);

  const [selectedAddressId, setselectedAddressId] = useState<string | null>(
    null
  );

  const [loadingAddress, setLoadingAddress] = useState(true);

  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
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

        setAddresses(data || []);
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
  }, [cart]);

  const navigate = useNavigate();

  if (!cart || cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] item-center justify-center">
        <p className="text-gray-500 text-lg">Your cart is empty</p>
      </div>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;

  // Safety: if restaurant is just a string ID (guest cart), show error
  if (!restaurant || typeof restaurant === "string") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500 text-lg">Invalid restaurant data. Please reload the page.</p>
      </div>
    );
  }

  const deliveryFee = subTotal < 250 ? 49 : 0;

  const platformFee = 7;

  const grandTotal = subTotal + deliveryFee + platformFee;

  const isFirstTimer = () => {
    try {
      if (user) {
        const key = `hasOrderedBefore_${user._id}`;
        return !localStorage.getItem(key);
      }
      return !localStorage.getItem("hasOrderedBefore_guest");
    } catch (err) {
      return true;
    }
  };

  const applyDiscounts = (baseDeliveryFee: number) => {
    let d = 0;
    if (discountCode.trim() === "") return { fee: baseDeliveryFee, discount: 0 };

    try {
      const stored = localStorage.getItem("discountCodes");
      if (stored) {
        const codes = JSON.parse(stored) as any[];
        const found = codes.find((c) => c.code === discountCode);
        if (found) {
          if (found.type === "freeDelivery") {
            if (isFirstTimer()) {
              d = baseDeliveryFee;
            }
          } else if (found.type === "percentage") {
            d = Math.round((found.value / 100) * (subTotal + baseDeliveryFee + platformFee));
          } else if (found.type === "fixed") {
            d = found.value;
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }

    return { fee: Math.max(0, baseDeliveryFee - d), discount: d };
  };

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

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
          <span>{deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatForm Fee</span>
          <span>{formatCurrency(platformFee)}</span>
        </div>

        {subTotal < 250 && (
          <p className="text-xs text-gray-500">
            Add Item worth {formatCurrency(250 - subTotal)} more to get Free delivery
          </p>
        )}

        <div className="flex justify-between text-base font-semibold border-t pt-2">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
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
              const res = applyDiscounts(deliveryFee);
              setDiscountAmount(res.discount);
              toast.success("Discount applied");
            }}
            className="rounded bg-gray-800 px-4 py-2 text-white"
          >
            Apply
          </button>
        </div>
        {discountAmount > 0 && (
          <p className="text-sm text-green-600">Discount applied: {formatCurrency(discountAmount)}</p>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
        <h3 className="font-semibold">Payment Method</h3>

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
          {loadingRazorpay ? (
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
