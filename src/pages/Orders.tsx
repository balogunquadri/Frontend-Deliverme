import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../main";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"active" | "completed">("active");
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/order/myorder`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setOrders(data.orders || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("order:update", onOrderUpdate);
    socket.on("order:rider_assigned", onOrderUpdate);

    return () => {
      socket.off("order:update", onOrderUpdate);
      socket.off("order:rider_assigned", onOrderUpdate);
    };
  }, [socket]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">No orders yet</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter(
    (o) => !ACTIVE_STATUSES.includes(o.status)
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>

      {/* Order Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-gray-600">Active Orders</p>
          <p className="text-2xl font-bold text-blue-600">
            {activeOrders.length}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm text-gray-600">Completed Orders</p>
          <p className="text-2xl font-bold text-green-600">
            {completedOrders.length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilterTab("active")}
          className={`px-4 py-2 rounded font-medium transition ${
            filterTab === "active"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Active ({activeOrders.length})
        </button>
        <button
          onClick={() => setFilterTab("completed")}
          className={`px-4 py-2 rounded font-medium transition ${
            filterTab === "completed"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Completed ({completedOrders.length})
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {filterTab === "active" ? "Active Orders" : "Completed Orders"}
        </h2>

        {filterTab === "active" ? (
          activeOrders.length === 0 ? (
            <p className="text-gray-500">No active orders</p>
          ) : (
            activeOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                onClick={() => navigate(`/order/${order._id}`)}
              />
            ))
          )
        ) : completedOrders.length === 0 ? (
          <p className="text-gray-500">No completed orders</p>
        ) : (
          completedOrders.map((order) => (
            <OrderRow
              key={order._id}
              order={order}
              onClick={() => navigate(`/order/${order._id}`)}
            />
          ))
        )}
      </section>
    </div>
  );
};

export default Orders;

// component Order row
const OrderRow = ({
  order,
  onClick,
}: {
  order: IOrder;
  onClick: () => void;
}) => {
  const { formatCurrency } = useAppData();
  return (
    <div
      className="cursor-pointer rounded-xl bg-white p-4 shadow-sm hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Order #{order._id.slice(-6)}</p>
        <span className="text-xs capitalize text-gray-500">{order.status}</span>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        {order.items.map((item, i) => (
          <span key={i}>
            {item.name} x {item.quauntity}
            {i < order.items.length - 1 && ", "}
          </span>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-sm font-medium">
        <span>Total</span>
        <span>{formatCurrency(order.totalAmount)}</span>
      </div>
    </div>
  );
};
