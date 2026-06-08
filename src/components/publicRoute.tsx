import { useAppData } from "../context/AppContext";
import { Navigate, Outlet } from "react-router-dom";

const PublicRoute = () => {
  // 🎯 Import the user object along with your auth states
  const { isAuth, loading, user } = useAppData();

  if (loading) return null;

  if (isAuth) {
    // 🔒 GUARD: If they are authenticated but haven't chosen a role, send them to selection!
    if (user?.role === null || user?.role === undefined) {
      return <Navigate to="/select-role" replace />;
    }

    // 🧭 SMART ROUTING: If they already have a role, send them to their home base
    if (user.role === "seller") return <Navigate to="/dashboard/seller" replace />;
    if (user.role === "rider") return <Navigate to="/dashboard/rider" replace />;
    if (user.role === "admin") return <Navigate to="/dashboard/admin" replace />;
    
    // Default Customer panel Fallback
    return <Navigate to="/Home" replace />;
  }

  // If they aren't logged in, let them access the Login / Signup forms
  return <Outlet />;
};

export default PublicRoute;