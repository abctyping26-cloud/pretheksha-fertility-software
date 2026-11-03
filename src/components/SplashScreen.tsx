import React, { useEffect, useState } from "react";
import mainLogo from "../assets/mainlogo.jpg";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Wait for 5 seconds, then trigger fade out before unmounting
    const timer = setTimeout(() => {
      setFadingOut(true);
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 500); // 500ms fade transition duration
      return () => clearTimeout(finishTimer);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-container ${fadingOut ? "fade-out" : ""}`}>
      <div className="splash-content">
        <div className="splash-logo-wrapper">
          <img src={mainLogo} alt="ABC Logo" className="splash-logo-img" />
        </div>
        <h1 className="splash-title">ABC SOLUTIONS</h1>
        <p className="splash-subtitle">Pretheeksha Fertility Software</p>
        <div className="splash-loader-bar">
          <div className="splash-loader-progress"></div>
        </div>
      </div>
    </div>
  );
};
