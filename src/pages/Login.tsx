import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast, { Toaster } from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const { setUser, setIsAuth } = useAppData();

  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateFields = (): boolean => {
    const { name, email, password, phoneNumber } = formData;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;

    if (!email.trim()) {
      toast.error("Email address is required.");
      return false;
    }
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      toast.error("Password field cannot be empty.");
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return false;
    }

    if (authMode === 'signup') {
      if (!name.trim()) {
        toast.error("Please enter your full name.");
        return false;
      }
      if (name.trim().length < 2) {
        toast.error("Name must be at least 2 characters long.");
        return false;
      }
      if (!phoneNumber.trim()) {
        toast.error("Phone number is required.");
        return false;
      }
      if (!phoneRegex.test(phoneNumber)) {
        toast.error("Please enter a valid phone number.");
        return false;
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
        toast.error("Password requires 1 uppercase letter, 1 lowercase letter, and 1 number.");
        return false;
      }
    }
    return true;
  };

  const handleRoleRouting = (userObj: any) => {
    if (!userObj?.role) {
      navigate("/select-role", { replace: true });
    } else if (userObj.role === "seller") {
      navigate("/dashboard/seller", { replace: true });
    } else if (userObj.role === "rider") {
      navigate("/dashboard/rider", { replace: true });
    } else if (userObj.role === "admin") {
      navigate("/dashboard/admin", { replace: true });
    } else {
      navigate("/home", { replace: true });
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return;

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const result = await axios.post(`${authService}/api/auth/register`, formData);
        
        // 🎯 FIXED: Purge any stale tokens before updating view states to block 401 triggers!
        localStorage.removeItem("token");
        if (setIsAuth) setIsAuth(false);
        
        toast.success(result.data.message || "Account created successfully! Please log in.");
        
        setFormData((prev) => ({
          ...prev,
          password: "",
        }));
        setAuthMode('login');

      } else {
        const result = await axios.post(`${authService}/api/auth/login`, { 
          email: formData.email, 
          password: formData.password 
        });

        localStorage.setItem("token", result.data.token);
        toast.success(result.data.message || "Welcome back!");
        setUser(result.data.user);
        if (setIsAuth) setIsAuth(true);

        const redirect = localStorage.getItem("postLoginRedirect");
        if (redirect) {
          localStorage.removeItem("postLoginRedirect");
          navigate(redirect, { replace: true });
        } else {
          handleRoleRouting(result.data.user);
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || `Problem while trying to ${authMode}`);
    } finally {
      setLoading(false);
    }
  };

  const responseGoogle = async (authResult: any) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult["code"],
      });

      const fullUser = result.data.user;
      localStorage.setItem("token", result.data.token);
      setUser(fullUser);

      if (fullUser && fullUser.role) {
        if (setIsAuth) setIsAuth(true);
      } else {
        if (setIsAuth) setIsAuth(false);
      }

      toast.success(result.data.message || "Logged in with Google!");
      const redirect = localStorage.getItem("postLoginRedirect");
      if (redirect) {
        localStorage.removeItem("postLoginRedirect");
        navigate(redirect, { replace: true });
      } else {
        handleRoleRouting(fullUser);
      }
    } catch (error) {
      console.error(error);
      toast.error("Problem while logging in with Google");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: responseGoogle,
    flow: "auth-code",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <Toaster />
      <div className="w-full max-w-sm space-y-6">
        <p className="text-center text-sm text-gray-500">
          {authMode === 'login' ? "Log in to your account" : "Sign up to continue"}
        </p>

        <button
          onClick={() => googleLogin()}
          disabled={loading}
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <FcGoogle size={20} />
          {loading ? "Processing..." : "Continue with Google"}
        </button>

        <div className="relative flex items-center justify-center py-2">
          <div className="w-full border-t border-gray-200"></div>
          <span className="absolute bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">or</span>
        </div>

        <form onSubmit={handleAuthSubmit} noValidate className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#373ae2] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="johndoe@example.com"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#373ae2] transition"
            />
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="+1 (555) 000-0000"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#373ae2] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#373ae2] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#373ae2] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#2b2ed1] active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "Processing..." : authMode === 'login' ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              // 🎯 FIXED: Purge storage data whenever manually toggling view states
              localStorage.removeItem("token");
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
            }}
            className="font-medium text-[#373ae2] hover:underline focus:outline-none"
          >
            {authMode === 'login' ? "Sign Up" : "Log In"}
          </button>
        </p>

        <p className="text-center text-xs text-gray-400">
          By continuing, you agree with our{" "}
          <span className="text-[#E23774] cursor-pointer hover:underline">Terms of Service</span> &{" "}
          <span className="text-[#E23774] cursor-pointer hover:underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;