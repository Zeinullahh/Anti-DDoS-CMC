// UIFrame.js
// Glassmorphic UI layout wrapper
import React, { useState, useCallback, useEffect } from 'react'; // Added useEffect
import IconButton from './IconButton'; // Assuming IconButton is in the same directory
import MenuPanel from './MenuPanel';   // Assuming MenuPanel is in the same directory
import SettingsDropdown from './SettingsDropdown'; // Added

const LOCAL_STORAGE_SETTINGS_KEY = 'globeAppSettings';

const initialAppSettings = {
  connectionRateLimit: 0,
  requestRateLimit: 0,
  requestTimeout: 30,
  cacheOptimizationEnabled: true,
  httpRequestQueueEnabled: false,
  geoIpUpdateFrequency: 'Daily', // Matched case for display
  geoIpManualHours: 24,
  // Keep old visibility settings for now, can be cleaned up later if not used
  visibility: {
    blockedIPs: true,
    unblockedIPs: true,
    blacklistedCountries: true,
    arcs: true,
  },
};


const UIFrame = ({ children, onBlacklistCountryCallback, onUnblacklistCountryCallback }) => { // Added onUnblacklistCountryCallback
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState(initialAppSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        // Merge with initialAppSettings to ensure all keys are present if some were added/removed
        setAppSettings(prev => ({ ...initialAppSettings, ...prev, ...parsedSettings }));
      } catch (error) {
        console.error("Failed to parse app settings from localStorage", error);
        setAppSettings(initialAppSettings); // Fallback to defaults
      }
    } else {
      setAppSettings(initialAppSettings); // No stored settings, use defaults
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Don't save initial empty state if it hasn't been populated from localStorage yet
    // or if it's still the default initialAppSettings object reference (first render)
    if (appSettings !== initialAppSettings && Object.keys(appSettings).length > 0) {
        try {
            localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(appSettings));
        } catch (error) {
            console.error("Failed to save app settings to localStorage", error);
        }
    }
  }, [appSettings]);

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

  const handleSettingChange = (key, value, category = null) => { // Modified signature for flexibility
    setAppSettings(prevSettings => {
      if (category) { // For nested settings like old 'visibility'
        return {
          ...prevSettings,
          [category]: {
            ...prevSettings[category],
            [key]: value
          }
        };
      }
      // For new top-level settings
      return {
        ...prevSettings,
        [key]: value
      };
    });
    // localStorage persistence is handled by the useEffect watching appSettings
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
