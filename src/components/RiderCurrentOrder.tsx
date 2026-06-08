import axios from "axios";
import { useState } from "react";
import type { IOrder } from "../types";
import { useAppData } from "../context/AppContext";
import { riderService } from "../main";
import toast from "react-hot-toast";

interface Props {
  order: IOrder;
  onStatusUpdate: () => void;
}

const RiderCurrentOrder = ({ order, onStatusUpdate }: Props) => {
  const [pin, setPin] = useState("");
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useAppData();

  const updateStatus = async (pinValue?: string) => {
    setLoading(true);
    try {
      await axios.put(
        `${riderService}/api/rider/order/update/${order._id}`,
        pinValue ? { pin: pinValue } : {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      toast.success("Order status updated");
      setShowPinPrompt(false);
      setPin("");
      onStatusUpdate();
    } catch (error: any) {
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryClick = () => {
    setShowPinPrompt(true);
  };

  const handlePinSubmit = () => {
    if (!pin.trim()) {
      toast.error("Please enter the PIN");
      return;
    }
    updateStatus(pin);
  };

  return (
    <div className="rounded-xl bg-white shadow-sm p-4 space-y-4">
      <h1 className="font-semibold text-gray-800">Current Order</h1>

      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <b>Pickup:</b>
          {order.restaurantName}
        </p>
        <p>
          <b>Drop:</b>
          {order.deliveryAddress.fromattedAddress}
        </p>
        <p>
          <b>Total:</b> {formatCurrency(order.totalAmount)}
        </p>
        <p>
          <b>Your Earning:</b> {formatCurrency(order.riderAmount)}
        </p>
        <p>
          <b>Status:</b>
          <span className="capitalize text-blue-600">
            {order.status.replace("_", " ")}
          </span>
        </p>
      </div>

      {order.deliveryAddress.mobile && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="text-sm">
            <p className="text-gray-500">Customer Phone</p>
            <p className="font-semibold text-gray-800">
              {order.deliveryAddress.mobile}
            </p>
          </div>
          <a
            href={`tel:${order.deliveryAddress.mobile}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Call
          </a>
        </div>
      )}

      <div className="space-y-2">
        {order.status === "rider_assigned" && (
          <button
            onClick={() => updateStatus()}
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg py-2 font-semibold"
          >
            {loading ? "Updating..." : "Reached Restaurant"}
          </button>
        )}

        {order.status === "picked_up" && !showPinPrompt && (
          <button
            onClick={handleDeliveryClick}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg py-2 font-semibold"
          >
            Mark as delivered
          </button>
        )}
      </div>

      {showPinPrompt && order.status === "picked_up" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-11/12 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg">Verify Delivery</h3>
            <p className="text-sm text-gray-600">
              Enter the delivery PIN from the customer to complete the delivery.
            </p>

            <input
              type="text"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase text-center font-bold text-lg tracking-widest"
            />

            <div className="flex gap-2">
              <button
                onClick={handlePinSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold"
              >
                {loading ? "Verifying..." : "Verify & Deliver"}
              </button>
              <button
                onClick={() => {
                  setShowPinPrompt(false);
                  setPin("");
                }}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-800 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderCurrentOrder;

