import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppData } from "../context/AppContext";

const ProtectedRoute = () => {
  const { isAuth, user, loading } = useAppData();
  const location = useLocation();

  if (loading) return null;

  // 1. If not logged in, kick them back to the public login screen
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if the user is missing a role selection
  const hasNoRole = !user?.role;

  // 🎯 RULE A: If they lack a role and are trying to access any page besides select-role, trap them
  if (hasNoRole && location.pathname !== "/select-role") {
    return <Navigate to="/select-role" replace />;
  }

  // 🎯 RULE B: Prevent users with established profiles from manually navigating backward to select-role
  // We check an explicit document property to see if they are fully synchronized out of the onboarding pool
  if (!hasNoRole && location.pathname === "/select-role") {
    if (user.role === "seller") return <Navigate to="/dashboard/seller" replace />;
    if (user.role === "rider") return <Navigate to="/dashboard/rider" replace />;
    if (user.role === "admin") return <Navigate to="/dashboard/admin" replace />;
    return <Navigate to="/home" replace />;
  }

  if (user?.role === "customer" && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/home" replace />;
  }

  // 3. Let them through safely to the requested route
  return <Outlet />;
};

export default ProtectedRoute;