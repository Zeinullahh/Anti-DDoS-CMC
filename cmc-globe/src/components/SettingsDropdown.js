import React, { useState, useEffect, useRef } from 'react';

const SettingsDropdown = ({ isOpen, onClose, settings, onSettingChange }) => {
  const panelRef = useRef(null); // Changed ref name for consistency
  const [showContent, setShowContent] = useState(false);

  // Default settings if none are provided
  const currentSettings = {
    visibility: {
      blockedIPs: true,
      unblockedIPs: true,
      blacklistedCountries: true,
      arcs: true,
      ...settings?.visibility,
    },
    ipManagement: {
      ...settings?.ipManagement,
    },
    antiDDoS: {
      ...settings?.antiDDoS,
    },
    geoIpFrequency: settings?.geoIpFrequency || 'daily',
  };
  
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Click outside to close (for the main modal, not dropdown behavior)
  // This useEffect for click outside is simplified as the backdrop div itself handles onClose.
  // No need for querySelector if the main div has the onClick.

  if (!isOpen) return null;

  const handleCheckboxChange = (category, key) => {
    onSettingChange(category, key, !currentSettings[category][key]);
  };

  const handleSelectChange = (key, value) => {
    onSettingChange(null, key, value);
  }

  const backdropBaseClasses = "fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ease-in-out settings-backdrop-unique-class";
  const panelBaseClasses = "glass-panel w-[320px] max-h-[80vh] flex flex-col overflow-hidden transition-all duration-300 ease-in-out p-5 shadow-2xl";


  return (
    <div
      className={`${backdropBaseClasses} ${showContent ? 'bg-black/30 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
      onClick={(e) => { // Click on backdrop closes
        if (e.target === e.currentTarget) {
            onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()} // Prevent click inside panel from closing
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            &times; {/* Close icon */}
          </button>
        </div>
        {/* Content of the settings panel */}

      {/* Visibility Section */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-200 mb-2">Visibility</h4>
        <div className="space-y-2">
          {Object.entries(currentSettings.visibility).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-600"
                checked={value}
                onChange={() => handleCheckboxChange('visibility', key)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Blocked IP Management (Placeholder) */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-200 mb-2">Blocked IP Management</h4>
        <p className="text-xs text-gray-400 italic">Configuration for managing individual IP blocks (e.g., add, remove, view list) will go here.</p>
        {/* Example: <button className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded mt-1">Manage IPs</button> */}
      </div>
      
      {/* Blacklisted Countries Management (Placeholder) */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-200 mb-2">Blacklisted Countries</h4>
        <p className="text-xs text-gray-400 italic">Management of blacklisted countries (view list, remove from blacklist) will be handled here or in the main panel.</p>
      </div>

      {/* Anti-DDoS Controls (Placeholder) */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-200 mb-2">Anti-DDoS Controls</h4>
        <p className="text-xs text-gray-400 italic">Controls for DDoS mitigation strategies (e.g., sensitivity levels, auto-block rules) will be here.</p>
      </div>

      {/* GeoIP Update Frequency */}
      <div>
        <h4 className="text-md font-medium text-gray-200 mb-2">GeoIP Update Frequency</h4>
        <select
          value={currentSettings.geoIpFrequency}
          onChange={(e) => handleSelectChange('geoIpFrequency', e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="manual">Manual</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
    </div> {/* This closes the inner panel div */}
  </div> // This closes the backdrop div
  );
};

export default SettingsDropdown;
