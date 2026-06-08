import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import HomePage from "./pages/Homepage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/protectedRote";
import PublicRoute from "./components/publicRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import AddAddressPage from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Courier from "./pages/Courier";
import Admin from "./pages/Admin";

const App = () => {
  const { loading } = useAppData();

  if (loading) {
    return (
      <h1 className="text-2xl font-bold text-blue-500 text-center mt-56">
        Loading...
      </h1>
    );
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* 🌐 1. Globally Accessible Public Base Path */}
        <Route path="/" element={<HomePage />} />

        {/* 🔐 2. Guest-Only Authentication Forms */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
        </Route>

        {/* 🛡️ 3. Secure Internal Application Infrastructure */}
        <Route path="/courier" element={<Courier />} />
        <Route element={<ProtectedRoute />}>
          {/* Role Choice Lockroom (Accessible ONLY when user.role is null) */}
          <Route path="/select-role" element={<SelectRole />} />

          {/* 🍔 Customer Specific Modules */}
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/address" element={<AddAddressPage />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/ordersuccess" element={<OrderSuccess />} />
          <Route path="/paymentsuccess/:paymentId" element={<PaymentSuccess />} />
          <Route path="/account" element={<Account />} />

          {/* 🍳 Merchant Specific Modules */}
          <Route path="/dashboard/seller" element={<Restaurant />} />

          {/* 🏍️ Rider Specific Modules */}
          <Route path="/dashboard/rider" element={<RiderDashboard />} />

          {/* 👑 System Administrator Panels */}
          <Route path="/dashboard/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;