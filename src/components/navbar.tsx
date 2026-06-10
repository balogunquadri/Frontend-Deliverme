import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { FiLogOut } from "react-icons/fi";
import { MdSmartToy } from "react-icons/md";
import AiAssistantDrawer from "./AiAssistantDrawer";

const Navbar = () => {
  const navigate = useNavigate();
  
  const { isAuth, city, quauntity, logout, user } = useAppData(); 
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  const handleLogout = () => {
    logout(); 
    navigate("/login");
  };

  const currLocation = useLocation();
  // const isHomePage = currLocation.pathname === "/";
  const isHome = currLocation.pathname === "/home";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setSearchParams({ search });
      } else {
        setSearchParams({});
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <div className="w-full bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            to={"/"}
            className="text-2xl font-bold text-[#373ae2] cursor-pointer"
          >
            Deliverme
          </Link>

          <div className="flex items-center gap-4">
           <button
  onClick={() => setShowAiAssistant(true)}
  className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[#373ae2] to-[#5b5cff] text-white hover:shadow-lg transition-shadow"
  title="AI Food Assistant"
  aria-label="Open AI Food Assistant"
>
  Ai Assistant <MdSmartToy size={22} />
</button>

            {(quauntity > 0 || (isAuth && user?.role === "customer")) && (
              <Link to={"/cart"} className="relative">
                <CgShoppingCart className="h-6 w-6 text-[#373ae2]" />
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#373ae2] text-xs font-semibold text-white">
                  {quauntity}
                </span>
              </Link>
            )}

            {isAuth ? (
              <>
                <Link to="/courier" className="font-medium text-[#373ae2]">
                  Courier
                </Link>
                <Link to="/account" className="font-medium text-[#373ae2]">
                  Account
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center p-2 rounded-md text-[#e23737] hover:bg-red-50 transition-colors duration-200"
                  title="Logout" 
                  aria-label="Logout" 
                >
                  <FiLogOut size={22} />
                </button>
              </>
            ) : (
              <>
                <Link to="/home" className="font-medium text-[#373ae2]">
                  Restaurants
                </Link>
                <Link to="/courier" className="font-medium text-[#373ae2]">
                  Courier
                </Link>
                <Link to="/login" className="font-medium text-[#373ae2]">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* search bar */}
        {isHome && (
          <div className="border-t px-4 py-3">
            <div className="mx-auto flex max-w-7xl items-center rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 px-3 border-r text-gray-700">
                <BiMapPin className="h-4 w-4 text-[#373ae2]" />
                <span className="text-sm truncate max-w-35">{city}</span>
              </div>
              <div className="flex flex-1 items-center gap-2 px-3">
                <BiSearch className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for restaurant"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <AiAssistantDrawer
        isOpen={showAiAssistant}
        onClose={() => setShowAiAssistant(false)}
      />
    </>
  );
};

export default Navbar;