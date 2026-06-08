import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../main";

type Role = "customer" | "rider" | "seller" | "admin" | null;

const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);
  const { setUser, setIsAuth } = useAppData();
  const navigate = useNavigate();

  const roles: Role[] = ["customer", "rider", "seller"];

  const addRole = async () => {
    if (!role) return;
    setLoading(true); 
    
    try {
      const { data } = await axios.post(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Save high-performance token containing fresh role permissions payload
      localStorage.setItem("token", data.token);
      setUser(data.user);
      if (setIsAuth) setIsAuth(true);

      // 🎯 FIXED: Cleaned duplicate text comments and streamlined target routing paths
      if (role === "seller") {
        navigate("/dashboard/seller", { replace: true });
      } else if (role === "rider") {
        navigate("/dashboard/rider", { replace: true });
      } else if (role === "admin") {
        navigate("/dashboard/admin", { replace: true });
      } else {
        navigate("/Home", { replace: true }); 
      }
      
    } catch (error) {
      alert("Something went wrong saving your role layout. Please try again.");
      console.error(error);
      setRole(null); 
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold text-gray-800">Choose your role</h1>

        <div className="space-y-4">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              disabled={loading}
              onClick={() => setRole(r)}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                role === r
                  ? "border-[#373ae2] bg-[#373ae2] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Continue as {r}
            </button>
          ))}
        </div>
        
        <button
          disabled={!role || loading}
          onClick={addRole}
          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
            role && !loading
              ? "bg-[#373ae2] text-white hover:bg-[#2c2ebd]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
};

export default SelectRole;