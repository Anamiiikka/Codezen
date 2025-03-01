// frontend/src/components/Business.jsx
import { features } from "../constants";
import styles, { layout } from "../style";
import Button from "./Button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const FeatureCard = ({ icon, title, content, index }) => {
  const navigate = useNavigate(); // Hook for navigation

  // Variants for the feature card animation
  const cardVariants = {
    hidden: { opacity: 0, x: -100, rotate: -10 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.7,
        ease: "easeOut",
        type: "spring",
      },
    }),
    hover: {
      y: -10,
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
      transition: { duration: 0.3 },
    },
  };

  // Handle click event for redirection
  const handleClick = () => {
    if (title === "Mutual Fund") {
      navigate("/dashboard/mutual-funds");
    } else if (title === "Cryptocurrency") {
      navigate("/dashboard/crypto");
    } else if (title === "Portfolio Tracking") {
      navigate("/dashboard/portfolio"); // Redirect to Portfolio Dashboard
    }
  };

  return (
    <motion.div
      className={`flex flex-row p-6 rounded-[20px] ${
        index !== features.length - 1 ? "mb-6" : "mb-0"
      } feature-card cursor-pointer`} // Added cursor-pointer for visual feedback
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      onClick={handleClick} // Add click handler
    >
      <div className={`w-[64px] h-[64px] rounded-full ${styles.flexCenter} bg-dimBlue`}>
        <img src={icon} alt="star" className="w-[50%] h-[50%] object-contain" />
      </div>
      <div className="flex-1 flex flex-col ml-3">
        <h4 className="font-poppins font-semibold text-white text-[18px] leading-[23.4px] mb-1">
          {title}
        </h4>
        <p className="font-poppins font-normal text-dimWhite text-[16px] leading-[24px]">
          {content}
        </p>
      </div>
    </motion.div>
  );
};

const Business = () => {
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <section id="features" className={layout.section}>
      <motion.div
        className={layout.sectionInfo}
        initial="hidden"
        animate="visible"
        variants={textVariants}
      >
        <h2 className={styles.heading2}>
          One flip changes everything. <br className="sm:block hidden" /> Will you take the shot, or
          <br className="sm:block hidden" /> let the game play you?
        </h2>
        <p className={`${styles.paragraph} max-w-[470px] mt-5`}>
          Personalized recommendations, live market analysis, and automated portfolio management with real-time risk assessment.
        </p>
        <Button styles="mt-10" />
      </motion.div>

      <div className={`${layout.sectionImg} flex-col`}>
        {features.map((feature, index) => (
          <FeatureCard key={feature.id} {...feature} index={index} />
        ))}
      </div>
    </section>
  );
};

export default Business;