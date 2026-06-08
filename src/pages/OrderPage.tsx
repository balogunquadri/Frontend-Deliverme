import { useParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import UserOrderMap from "../components/UserOrderMap";
import toast from "react-hot-toast";
import { MdContentCopy, MdStar } from "react-icons/md";

interface IReview {
  rating: number;
  title: string;
  comment: string;
}

const OrderPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();
  const { formatCurrency } = useAppData();

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [review, setReview] = useState<IReview>({
    rating: 5,
    title: "",
    comment: "",
  });
  const [existingReview, setExistingReview] = useState<any>(null);

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrder(data);

      if (data.status === "delivered") {
        fetchReview(data._id);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReview = async (orderId: string) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/${orderId}/review`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setExistingReview(data);
    } catch (error) {
      console.log("No review found");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("PIN copied to clipboard!");
  };

  const submitReview = async () => {
    if (!review.title.trim()) {
      toast.error("Please enter a review title");
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/${order?._id}/review`,
        review,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setExistingReview(data.review);
      setShowReviewForm(false);
      toast.success("Review submitted successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrder();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join", `user:${id}`);

    return () => {
      socket.emit("leave", `user:${id}`);
    };
  }, [socket, id]);

  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    if (!socket) return;

    const onRiderLocation = ({ latitude, longitude }: any) => {
      console.log("Rider Location:", latitude, longitude);
      setRiderLocation([latitude, longitude]);
    };

    socket.on("rider:location", onRiderLocation);

    return () => {
      socket.off("rider:location", onRiderLocation);
    };
  }, [socket]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading order...</p>;
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">No order Found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Order #{order._id.slice(-6)}</h1>
      <div className="rounded-lg bg-blue-50 p-3 text-sm font-medium">
        Status: <span className="capitalize">{order.status}</span>
      </div>

      {order.orderPin && order.status !== "delivered" && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <h3 className="font-semibold text-green-900 mb-2">
            Delivery PIN for your rider
          </h3>
          <div className="flex items-center gap-2 bg-white p-3 rounded border border-green-300">
            <span className="text-2xl font-bold text-green-600 tracking-widest">
              {order.orderPin}
            </span>
            <button
              onClick={() => copyToClipboard(order.orderPin)}
              className="p-2 hover:bg-green-100 rounded transition-colors"
              title="Copy PIN"
            >
              <MdContentCopy className="text-green-600" size={20} />
            </button>
          </div>
          <p className="text-sm text-green-700 mt-2">
            Share this PIN with your delivery rider to confirm the delivery.
          </p>
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <h2 className="font-semibold">Items</h2>
        {order.items.map((item, i) => (
          <div className="flex justify-between text-sm" key={i}>
            <span>
              {item.name} x {item.quauntity}
            </span>
            <span>{formatCurrency(item.price * item.quauntity)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-1">
        <h2 className="font-semibold">Delivery Address</h2>
        <p className="text-sm text-gray-600">
          {order.deliveryAddress.fromattedAddress}
        </p>
        <p className="text-sm text-gray-600">
          Mobile: {order.deliveryAddress.mobile}
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
        <div className="flex justify-between text-sm">
          <span>SubTotal</span> <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span> <span>{formatCurrency(order.deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>PlatForm Fee</span> <span>{formatCurrency(order.platfromFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total</span> <span>{formatCurrency(order.totalAmount)}</span>
        </div>

        <p className="text-xs text-gray-500">
          Payment Method: {order.paymentMethod}
        </p>
        <p className="text-xs text-gray-500">
          Payment Status: {order.paymentStatus}
        </p>
      </div>

      {(order.status === "rider_assigned" || order.status === "picked_up") &&
        (riderLocation ? (
          <UserOrderMap
            riderLocation={riderLocation}
            deliveryLocation={[
              order.deliveryAddress.latitude!,
              order.deliveryAddress.longitude!,
            ]}
          />
        ) : (
          <p>Waiting for rider location</p>
        ))}

      {order.status === "delivered" && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          {existingReview ? (
            <div className="space-y-3">
              <h3 className="font-semibold">Your Review</h3>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <MdStar
                    key={i}
                    size={20}
                    className={
                      i < existingReview.rating
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <h4 className="font-medium">{existingReview.title}</h4>
              <p className="text-sm text-gray-600">{existingReview.comment}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {!showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Leave a Review
                </button>
              )}

              {showReviewForm && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Leave a Review</h3>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() =>
                            setReview({ ...review, rating: rating })
                          }
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <MdStar
                            size={28}
                            className={
                              rating <= review.rating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Review Title *
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Great food and fast delivery"
                      value={review.title}
                      onChange={(e) =>
                        setReview({ ...review, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Comment
                    </label>
                    <textarea
                      maxLength={500}
                      placeholder="Share your experience..."
                      value={review.comment}
                      onChange={(e) =>
                        setReview({ ...review, comment: e.target.value })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderPage;
