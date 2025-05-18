// UIFrame.js
// Glassmorphic UI layout wrapper
import React, { useState, useCallback } from 'react'; // Added useCallback
import IconButton from './IconButton'; // Assuming IconButton is in the same directory
import MenuPanel from './MenuPanel';   // Assuming MenuPanel is in the same directory
import SettingsDropdown from './SettingsDropdown'; // Added

const UIFrame = ({ children, onBlacklistCountryCallback, onUnblacklistCountryCallback }) => { // Added onUnblacklistCountryCallback
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({
    visibility: {
      blockedIPs: true,
      unblockedIPs: true,
      blacklistedCountries: true,
      arcs: true,
    },
    geoIpFrequency: 'daily',
  });

  const toggleMenuPanel = () => {
    setIsMenuPanelOpen(prev => !prev);
    if (isSettingsOpen) setIsSettingsOpen(false); 
  };

  const toggleSettings = () => {
    setIsSettingsOpen(prev => !prev);
    if (isMenuPanelOpen) setIsMenuPanelOpen(false); 
  };

  const handleChatClick = () => {
    console.log("Chat icon clicked - Placeholder");
    // Implement chat functionality or panel toggle here
  };

  const handleSettingChange = (category, key, value) => {
    setAppSettings(prevSettings => {
      if (category) {
        return {
          ...prevSettings,
          [category]: {
            ...prevSettings[category],
            [key]: value
          }
        };
      }
      // For top-level settings like geoIpFrequency
      return {
        ...prevSettings,
        [key]: value
      };
    });
    // Here you would also persist settings if needed (e.g., to localStorage or a backend)
    console.log(`Setting changed: ${category ? `${category}.${key}` : key} = ${value}`);
  };

  // This function will be passed to MenuPanel and eventually to Globe to update dot colors
  const handleBlacklistCountryInUIFrame = useCallback((countryCode, countryName, isInitial = false) => { // Accept isInitial
    console.log(`UIFrame: Blacklisting country ${countryName} (${countryCode}), initial: ${isInitial}`);
    if (onBlacklistCountryCallback) {
      onBlacklistCountryCallback(countryCode, countryName, isInitial); // Pass isInitial along
    }
  }, [onBlacklistCountryCallback]);

  const handleUnblacklistCountryInUIFrame = useCallback((countryCode, countryName) => {
    console.log(`UIFrame: Unblacklisting country ${countryName} (${countryCode})`);
    if (onUnblacklistCountryCallback) {
      onUnblacklistCountryCallback(countryCode, countryName);
    }
  }, [onUnblacklistCountryCallback]);

  return (
    <div className="relative w-full h-screen bg-[#0f0b16] overflow-hidden">
      {/* Main content, e.g., the Globe */}
      {children}

      {/* Logo in top-left */}
      <div className="absolute top-5 left-5 z-20">
        <img src="/logo.svg" alt="Logo" className="w-10 h-10" /> {/* Adjust size as needed */}
      </div>
      
      {/* Settings Icon Button - Top Right */}
      <IconButton
        iconSrc="/icons/settings.svg" // Corrected to iconSrc to match IconButton prop
        altText="Settings"
        onClick={toggleSettings}
        positionClasses="absolute top-5 right-5 z-30 settings-toggle-button" 
        tooltip="Settings"
      />

      {/* Performance/Menu Panel Icon Button - Bottom Left */}
      <IconButton
        iconSrc="/performance.svg" // Reverted path: directly in public folder
        altText="Analytics Panel"
        onClick={toggleMenuPanel}
        positionClasses="absolute bottom-5 left-5 z-20"
        tooltip="Open Analytics Panel"
      />

      {/* Chat Icon Button - Bottom Right */}
      <IconButton
        iconSrc="/icons/chat.svg" // Corrected to iconSrc
        altText="Chat"
        onClick={handleChatClick} // Added placeholder handler
        positionClasses="absolute bottom-5 right-5 z-20"
        tooltip="Chat"
      />

      <MenuPanel 
        isOpen={isMenuPanelOpen} 
        onClose={toggleMenuPanel} 
        onBlacklistCountry={handleBlacklistCountryInUIFrame}
        onUnblacklistCountry={handleUnblacklistCountryInUIFrame} // Pass down the new handler
      />

      <SettingsDropdown
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        settings={appSettings}
        onSettingChange={handleSettingChange}
      />
    </div>
  );
};

export default UIFrame;
