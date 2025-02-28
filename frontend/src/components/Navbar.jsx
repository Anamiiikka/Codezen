// frontend/src/components/Navbar.jsx
import { useState } from "react";
import { close, logo, menu } from "../assets";
import { navLinks } from "../constants";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const Navbar = () => {
  const { logout, isAuthenticated } = useAuth0();
  const [active, setActive] = useState("Home");
  const [toggle, setToggle] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  // Toggle dropdown on click
  const handleDropdownToggle = () => {
    setDropdown((prev) => !prev);
  };

  return (
    <nav className="w-full flex py-6 justify-between items-center navbar">
      <Link to="/">
        <img src={logo} alt="hoobank" className="w-[124px] h-[32px]" />
      </Link>

      <ul className="list-none sm:flex hidden justify-end items-center flex-1">
        {navLinks.map((nav, index) => (
          <li
            key={nav.id}
            className={`relative font-poppins font-normal cursor-pointer text-[16px] ${
              active === nav.title ? "text-white" : "text-dimWhite"
            } ${index === navLinks.length - 1 ? "mr-10" : "mr-10"}`}
            onClick={() => {
              setActive(nav.title);
              if (nav.id === "Options") handleDropdownToggle(); // Toggle dropdown on click
            }}
          >
            {nav.id === "Options" ? (
              <>
                <span>{nav.title}</span>
                {dropdown && (
                  <ul className="absolute top-full left-0 mt-2 bg-gray-800 p-4 rounded-lg shadow-lg w-[200px] z-10">
                    <li className="text-white px-4 py-3 hover:bg-gray-700 cursor-pointer">
                      <Link to="/dashboard/stocks" onClick={() => setDropdown(false)}>
                        Stocks
                      </Link>
                    </li>
                    <li className="text-white px-4 py-3 hover:bg-gray-700 cursor-pointer">
                      <Link to="/dashboard/mutual-funds" onClick={() => setDropdown(false)}>
                        Mutual Funds
                      </Link>
                    </li>
                    <li className="text-white px-4 py-3 hover:bg-gray-700 cursor-pointer">
                      <Link to="/dashboard/crypto" onClick={() => setDropdown(false)}>
                        Crypto
                      </Link>
                    </li>
                  </ul>
                )}
              </>
            ) : (
              <Link to={nav.id === "home" ? "/" : `/${nav.id}`}>
                {nav.title}
              </Link>
            )}
          </li>
        ))}
        {isAuthenticated && (
          <li className="ml-6">
            <button
              type="button"
              className="py-4 px-6 font-poppins font-medium text-[18px] text-primary bg-blue-gradient rounded-[10px] outline-none"
              onClick={() => logout({ returnTo: window.location.origin })}
            >
              Logout
            </button>
          </li>
        )}
      </ul>

      <div className="sm:hidden flex flex-1 justify-end items-center">
        <img
          src={toggle ? close : menu}
          alt="menu"
          className="w-[28px] h-[28px] object-contain"
          onClick={() => setToggle(!toggle)}
        />
        <div
          className={`${
            !toggle ? "hidden" : "flex"
          } p-6 bg-black-gradient absolute top-20 right-0 mx-4 my-2 min-w-[140px] rounded-xl sidebar`}
        >
          <ul className="list-none flex justify-end items-start flex-1 flex-col">
            {navLinks.map((nav, index) => (
              <li
                key={nav.id}
                className={`font-poppins font-medium cursor-pointer text-[16px] ${
                  active === nav.title ? "text-white" : "text-dimWhite"
                } ${index === navLinks.length - 1 ? "mb-4" : "mb-4"}`}
                onClick={() => {
                  setActive(nav.title);
                  if (nav.id === "Options") handleDropdownToggle(); // Toggle dropdown on click (optional for mobile)
                }}
              >
                {nav.id === "Options" ? (
                  <>
                    <span>{nav.title}</span>
                    {dropdown && (
                      <ul className="mt-2">
                        <li className="text-white py-2">
                          <Link to="/dashboard/stocks" onClick={() => setDropdown(false)}>
                            Stocks
                          </Link>
                        </li>
                        <li className="text-white py-2">
                          <Link to="/dashboard/mutual-funds" onClick={() => setDropdown(false)}>
                            Mutual Funds
                          </Link>
                        </li>
                        <li className="text-white py-2">
                          <Link to="/dashboard/crypto" onClick={() => setDropdown(false)}>
                            Crypto
                          </Link>
                        </li>
                      </ul>
                    )}
                  </>
                ) : (
                  <Link to={nav.id === "home" ? "/" : `/${nav.id}`}>
                    {nav.title}
                  </Link>
                )}
              </li>
            ))}
            {isAuthenticated && (
              <li className="mt-4">
                <button
                  type="button"
                  className="py-4 px-6 font-poppins font-medium text-[18px] text-primary bg-blue-gradient rounded-[10px] outline-none"
                  onClick={() => logout({ returnTo: window.location.origin })}
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;