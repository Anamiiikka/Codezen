import styles from "../style";
import { arrowUp } from "../assets";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import axios from "axios";

const GetStarted = () => {
  const { loginWithRedirect, isAuthenticated, user } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Send user data to backend
      axios.post(`${import.meta.env.VITE_API_URL}/api/save-user`, user)

        .then((response) => {
          console.log("User saved:", response.data);
        })
        .catch((error) => {
          console.error("Error saving user:", error);
        });
    }
  }, [isAuthenticated, user]);

  return (
    <div
      className={`${styles.flexCenter} w-[140px] h-[140px] rounded-full bg-blue-gradient p-[2px] cursor-pointer`}
      onClick={!isAuthenticated ? () => loginWithRedirect() : null}
    >
      <div className={`${styles.flexCenter} flex-col bg-primary w-[100%] h-[100%] rounded-full`}>
        {isAuthenticated && user ? (
          <>
            <p className="font-poppins font-medium text-[18px] leading-[23.4px]">
              <span className="text-gradient">Welcome</span>
            </p>
            <p className="font-poppins font-medium text-[18px] leading-[23.4px]">
              <span className="text-gradient">{user.given_name || user.name}</span>
            </p>
          </>
        ) : (
          <>
            <div className={`${styles.flexStart} flex-row`}>
              <p className="font-poppins font-medium text-[18px] leading-[23.4px]">
                <span className="text-gradient">Login</span>
              </p>
              <img src={arrowUp} alt="arrow-up" className="w-[23px] h-[23px] object-contain" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GetStarted;