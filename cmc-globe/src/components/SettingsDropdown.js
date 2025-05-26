import React, { useState, useEffect, useRef } from 'react';

const SettingsDropdown = ({ isOpen, onClose, settings, onSettingChange }) => {
  const panelRef = useRef(null);
  const [showContent, setShowContent] = useState(false);

  // currentSettings will now directly be the settings prop from UIFrame
  // UIFrame handles defaults and localStorage loading.
  const currentSettings = settings;

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

  // Generic handler for most inputs
  const handleChange = (key, value, type = 'value') => {
    let processedValue = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value); // Allow empty string for clearing, then convert
    } else if (type === 'checkbox') {
      processedValue = value; // Directly use boolean
    }
    onSettingChange(key, processedValue); // category is null for these top-level settings
  };
  
  const backdropBaseClasses = "fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ease-in-out settings-backdrop-unique-class";
  // Changed width to 60vw
  const panelBaseClasses = "glass-panel w-[60vw] max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ease-in-out p-6 shadow-2xl text-white";

  // Helper component for each setting row
  const SettingRow = ({ label, tooltipText, children }) => (
    <div className="mb-5">
      <div className="flex items-center mb-1">
        <label className="block text-sm font-medium text-gray-200 mr-2">{label}</label>
        {tooltipText && (
          <div className="relative group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.755 4 3.92C16 12.802 14.904 14 12.94 14c-.992 0-1.824-.402-2.438-1.038M12 17v.01" />
            </svg>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
              {tooltipText}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );

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
        className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} overflow-y-auto`} // Added overflow-y-auto
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            &times;
          </button>
        </div>

        {/* New Settings Sections */}
        <SettingRow label="Connection Rate Limiting" tooltipText="The limit_conn module can limit the number of connections established by each IP at the same time. (e.g., connections per IP)">
          <input
            type="number"
            min="0"
            value={currentSettings.connectionRateLimit || ''}
            onChange={(e) => handleChange('connectionRateLimit', e.target.value, 'number')}
            className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
            placeholder="e.g., 10"
          />
        </SettingRow>

        <SettingRow label="Request Rate Limiting" tooltipText="The limit_req module can be used to limit the request rate to prevent some malicious users from making a large number of requests too quickly. (e.g., requests per second per IP)">
          <input
            type="number"
            min="0"
            value={currentSettings.requestRateLimit || ''}
            onChange={(e) => handleChange('requestRateLimit', e.target.value, 'number')}
            className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
            placeholder="e.g., 5"
          />
        </SettingRow>

        <SettingRow label="Request Timeout Setting" tooltipText="Reasonable request timeout setting can prevent malicious users from occupying server resources for a long time and reduce DDoS attacks such as slowloris. (in seconds)">
          <input
            type="number"
            min="0"
            value={currentSettings.requestTimeout || ''}
            onChange={(e) => handleChange('requestTimeout', e.target.value, 'number')}
            className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
            placeholder="e.g., 30"
          />
        </SettingRow>

        <SettingRow label="Cache and Static Resource Optimization" tooltipText="By configuring cache and optimizing the delivery of static resources, you can reduce the number of requests that web server directly handles on the backend.">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={currentSettings.cacheOptimizationEnabled || false}
                onChange={(e) => handleChange('cacheOptimizationEnabled', e.target.checked, 'checkbox')}
              />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
            <span className="ml-3 text-sm text-gray-300">
              {currentSettings.cacheOptimizationEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </SettingRow>

        <SettingRow label="Use HTTP Request Queue" tooltipText="With the ngx_http_limit_req_module module, you can put incoming requests into a queue.">
           <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={currentSettings.httpRequestQueueEnabled || false}
                onChange={(e) => handleChange('httpRequestQueueEnabled', e.target.checked, 'checkbox')}
              />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
            <span className="ml-3 text-sm text-gray-300">
              {currentSettings.httpRequestQueueEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </SettingRow>
        
        <div className="mt-6 pt-4 border-t border-white/10">
          <SettingRow label="GeoIP Update Frequency" tooltipText={null}>
            <select
              value={currentSettings.geoIpUpdateFrequency || 'Daily'}
              onChange={(e) => handleChange('geoIpUpdateFrequency', e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="Set manually">Set manually</option>
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </SettingRow>

          {currentSettings.geoIpUpdateFrequency === 'Set manually' && (
            <SettingRow label="Manual Update Frequency (hours)" tooltipText="Enter the update interval in hours.">
              <input
                type="number"
                min="1"
                value={currentSettings.geoIpManualHours || ''}
                onChange={(e) => handleChange('geoIpManualHours', e.target.value, 'number')}
                className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
                placeholder="e.g., 24"
              />
            </SettingRow>
          )}
        </div>

      </div>
    </div>
  );
};

export default SettingsDropdown;
