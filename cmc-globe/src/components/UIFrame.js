// UIFrame.js
// Glassmorphic UI layout wrapper
import React, { useState, useCallback, useEffect } from 'react';
import IconButton from './IconButton';
import MenuPanel from './MenuPanel';
import SettingsDropdown from './SettingsDropdown';
import ChatPanel from './ChatPanel'; // Import ChatPanel

const LOCAL_STORAGE_SETTINGS_KEY = 'globeAppSettings';

const initialAppSettings = {
  connectionRateLimit: {
    zoneSize: '10m',
    maxConnections: 10,
  },
  requestRateLimit: {
    zoneSize: '10m',
    rate: '5r/s',
    burst: 10,
    noDelay: true,
  },
  requestTimeout: {
    keepalive: 10,
    maxBodySize: '1m', // string input
    bodyTimeout: 10,   // number input (seconds)
    headerTimeout: 10, // number input (seconds)
  },
  cacheOptimizationEnabled: true,
  httpRequestQueueEnabled: false,
  geoIpUpdateFrequency: 'Daily',
  geoIpManualHours: 24,
  // Old visibility settings - can be removed if no longer needed by SettingsDropdown
  visibility: { 
    blockedIPs: true,
    unblockedIPs: true,
    blacklistedCountries: true,
    arcs: true,
  },
};


const UIFrame = ({ children, onBlacklistCountryCallback, onUnblacklistCountryCallback }) => {
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false); // State for ChatPanel
  const [appSettings, setAppSettings] = useState(() => {
    // Load initial state from localStorage or use defaults
    const storedSettings = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY) : null;
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        // Deep merge to ensure new default fields are added if not in localStorage
        // and old ones from localStorage are preserved if still relevant.
        return {
          ...initialAppSettings,
          ...parsed,
          connectionRateLimit: { ...initialAppSettings.connectionRateLimit, ...parsed.connectionRateLimit },
          requestRateLimit: { ...initialAppSettings.requestRateLimit, ...parsed.requestRateLimit },
          requestTimeout: { ...initialAppSettings.requestTimeout, ...parsed.requestTimeout },
          visibility: { ...initialAppSettings.visibility, ...parsed.visibility },
        };
      } catch (error) {
        console.error("Failed to parse app settings from localStorage", error);
        return initialAppSettings; // Fallback to defaults
      }
    }
    return initialAppSettings; // No stored settings, use defaults
  });

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
    if (isChatPanelOpen) setIsChatPanelOpen(false); // Close chat if settings open
  };

  const handleChatClick = () => {
    setIsChatPanelOpen(prev => !prev);
    if (isMenuPanelOpen) setIsMenuPanelOpen(false); // Close menu if chat opens
    if (isSettingsOpen) setIsSettingsOpen(false); // Close settings if chat opens
  };

  const handleSettingChange = (mainKey, subKey, value) => {
    setAppSettings(prevSettings => {
      if (subKey) { // It's a nested property
        return {
          ...prevSettings,
          [mainKey]: {
            ...prevSettings[mainKey],
            [subKey]: value
          }
        };
      }
      // It's a top-level property (e.g., cacheOptimizationEnabled, geoIpUpdateFrequency)
      return {
        ...prevSettings,
        [mainKey]: value
      };
    });
    // console.log(`Setting changed: ${mainKey}${subKey ? `.${subKey}` : ''} = ${value}`);
  };
  
  // New handler to accept the whole settings object at once
  const handleSettingsSave = (newSettings) => {
    setAppSettings(newSettings);
    console.log("Settings saved:", newSettings);
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
        <img src="/logo.svg" alt="Logo" className="w-6 h-6" /> {/* CHANGED HERE */}
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
        iconSrc="/icons/chat.svg"
        altText="Chat"
        onClick={handleChatClick}
        positionClasses="absolute bottom-5 right-5 z-20"
        tooltip="Chat"
        bgClass="bg-black/30 hover:bg-black/50" // Added custom background for chat icon
      />

      <MenuPanel 
        isOpen={isMenuPanelOpen} 
        onClose={toggleMenuPanel} 
        onBlacklistCountry={handleBlacklistCountryInUIFrame}
        onUnblacklistCountry={handleUnblacklistCountryInUIFrame} // Pass down the new handler
      />

      <SettingsDropdown
        isOpen={isSettingsOpen}
        onClose={toggleSettings} // This will just close, save will be handled inside SettingsDropdown
        currentGlobalSettings={appSettings}
        onSettingsSave={handleSettingsSave}
      />

      <ChatPanel
        isOpen={isChatPanelOpen}
        onClose={() => setIsChatPanelOpen(false)}
        currentGlobalSettings={appSettings}
        onSettingsSave={handleSettingsSave} // Chat can also save settings
      />
    </div>
  );
};

export default UIFrame;
