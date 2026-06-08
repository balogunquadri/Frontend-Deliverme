import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage, BiStore, BiTrendingUp, BiCheckDouble, BiCycling, BiBadgeCheck } from "react-icons/bi";
import { AiOutlineShoppingCart } from "react-icons/ai";

const Account = () => {
  const { user, logout } = useAppData();

  const firstLetter = user?.name.charAt(0).toUpperCase();

  const navigate = useNavigate();

  const logoutHandler = () => {
    logout();
    navigate("/login");
    toast.success("Logout Success");
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-md rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl font-semibold text-white">
            {firstLetter}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.role && (
              <p className="text-xs text-blue-600 font-medium capitalize">
                {user.role}
              </p>
            )}
          </div>
        </div>
        <div className="divide-y">
          {/* Customer Links */}
          {user?.role === "customer" && (
            <>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/home")}
              >
                <AiOutlineShoppingCart className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Browse Restaurants</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/orders")}
              >
                <BiPackage className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Your Orders</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/address")}
              >
                <BiMapPin className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Saved Addresses</span>
              </div>
            </>
          )}

          {/* Seller Links */}
          {user?.role === "seller" && (
            <>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/seller")}
              >
                <BiStore className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Restaurant Dashboard</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/seller#orders")}
              >
                <BiPackage className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Manage Orders</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/seller#menu")}
              >
                <AiOutlineShoppingCart className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Manage Menu</span>
              </div>
            </>
          )}

          {/* Rider Links */}
          {user?.role === "rider" && (
            <>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/rider")}
              >
                <BiCycling className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Delivery Dashboard</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/rider#orders")}
              >
                <BiCheckDouble className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Available Orders</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/rider#active")}
              >
                <BiTrendingUp className="h-5 w-5 text-blue-500" />
                <span className="font-medium">My Earnings</span>
              </div>
            </>
          )}

          {/* Admin Links */}
          {user?.role === "admin" && (
            <>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/admin")}
              >
                <BiStore className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Admin Dashboard</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/admin#restaurant")}
              >
                <BiCheckDouble className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Verify Restaurants</span>
              </div>
              <div
                className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                onClick={() => navigate("/dashboard/admin#rider")}
              >
                <BiBadgeCheck className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Verify Riders</span>
              </div>
            </>
          )}

          {/* Logout - Always Available */}
          <div
            className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
            onClick={logoutHandler}
          >
            <BiLogOut className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
