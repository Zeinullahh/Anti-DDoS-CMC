import React, { useState, useEffect, useRef, useCallback } from 'react';

const SettingsDropdown = ({ isOpen, onClose, currentGlobalSettings, onSettingsSave }) => {
  const panelRef = useRef(null);
  const [showContent, setShowContent] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);

  // --- HOOKS CALLED AT TOP LEVEL ---
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(JSON.parse(JSON.stringify(currentGlobalSettings)));
      const timer = setTimeout(() => setShowContent(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, currentGlobalSettings]); // currentGlobalSettings added back to ensure re-init if global changes while closed

  const handleLocalChange = useCallback((mainKey, subKey, eventValue, type = 'text') => {
    let processedValue = eventValue;
    if (type === 'number') {
      processedValue = eventValue === '' ? '' : Number(eventValue);
    } else if (type === 'checkbox') {
      processedValue = eventValue; 
    }

    setLocalSettings(prev => {
      if (!prev) return null; // Should not happen if isOpen is true
      if (subKey) {
        return {
          ...prev,
          [mainKey]: {
            ...(prev[mainKey] || {}),
            [subKey]: processedValue
          }
        };
      }
      return {
        ...prev,
        [mainKey]: processedValue
      };
    });
  }, []); // Removed setLocalSettings from dep array as it's stable, but ESLint might prefer it.

  const handleConfirmClose = useCallback(() => {
    if (localSettings) { // Ensure localSettings is not null
        onSettingsSave(localSettings);
    }
    onClose();
  }, [localSettings, onSettingsSave, onClose]);

  // --- CONDITIONAL RENDERING ---
  // If not open or localSettings hasn't been initialized yet (can happen briefly)
  if (!isOpen || !localSettings) {
    return null; 
  }

  // --- JSX ---
  const backdropBaseClasses = "fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ease-in-out settings-backdrop-unique-class";
  const panelBaseClasses = "glass-panel w-[60vw] max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ease-in-out p-6 shadow-2xl text-white";

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

  const InputField = ({ label, value, onChange, type = "text", placeholder = "", min = undefined }) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        min={min}
        value={value || ''}
        onChange={onChange}
        className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div
      className={`${backdropBaseClasses} ${showContent ? 'bg-black/30 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
            handleConfirmClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} overflow-y-auto`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Settings</h3>
          <button
            onClick={handleConfirmClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            &times;
          </button>
        </div>

        <SettingRow label="Connection Rate Limiting" tooltipText="The limit_conn module can limit the number of connections established by each IP at the same time.">
          <div className="grid md:grid-cols-2 gap-4">
            <InputField
              label="Zone Size (e.g., 10m)"
              value={localSettings.connectionRateLimit?.zoneSize}
              onChange={(e) => handleLocalChange('connectionRateLimit', 'zoneSize', e.target.value, 'text')}
            />
            <InputField
              label="Max Connections per IP"
              type="number"
              min="0"
              value={localSettings.connectionRateLimit?.maxConnections}
              onChange={(e) => handleLocalChange('connectionRateLimit', 'maxConnections', e.target.value, 'number')}
            />
          </div>
        </SettingRow>

        <SettingRow label="Request Rate Limiting" tooltipText="The limit_req module can be used to limit the request rate to prevent some malicious users from making a large number of requests too quickly.">
          <div className="grid md:grid-cols-2 gap-4 mb-2">
            <InputField
              label="Zone Size (e.g., 10m)"
              value={localSettings.requestRateLimit?.zoneSize}
              onChange={(e) => handleLocalChange('requestRateLimit', 'zoneSize', e.target.value, 'text')}
            />
            <InputField
              label="Rate (e.g., 5r/s)"
              value={localSettings.requestRateLimit?.rate}
              onChange={(e) => handleLocalChange('requestRateLimit', 'rate', e.target.value, 'text')}
            />
            <InputField
              label="Burst"
              type="number"
              min="0"
              value={localSettings.requestRateLimit?.burst}
              onChange={(e) => handleLocalChange('requestRateLimit', 'burst', e.target.value, 'number')}
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-600"
                  checked={localSettings.requestRateLimit?.noDelay || false}
                  onChange={(e) => handleLocalChange('requestRateLimit', 'noDelay', e.target.checked, 'checkbox')}
                />
                <span className="ml-2 text-sm text-gray-300">No Delay</span>
              </label>
            </div>
          </div>
        </SettingRow>

        <SettingRow label="Request Timeout Settings" tooltipText="Reasonable request timeout setting can prevent malicious users from occupying server resources for a long time and reduce DDoS attacks such as slowloris.">
          <div className="grid md:grid-cols-2 gap-4">
            <InputField
              label="Keepalive Timeout (s)"
              type="number"
              min="0"
              value={localSettings.requestTimeout?.keepalive}
              onChange={(e) => handleLocalChange('requestTimeout', 'keepalive', e.target.value, 'number')}
            />
            <InputField
              label="Client Max Body Size (e.g., 1m)"
              value={localSettings.requestTimeout?.maxBodySize}
              onChange={(e) => handleLocalChange('requestTimeout', 'maxBodySize', e.target.value, 'text')}
            />
            <InputField
              label="Client Body Timeout (s)"
              type="number"
              min="0"
              value={localSettings.requestTimeout?.bodyTimeout}
              onChange={(e) => handleLocalChange('requestTimeout', 'bodyTimeout', e.target.value, 'number')}
            />
            <InputField
              label="Client Header Timeout (s)"
              type="number"
              min="0"
              value={localSettings.requestTimeout?.headerTimeout}
              onChange={(e) => handleLocalChange('requestTimeout', 'headerTimeout', e.target.value, 'number')}
            />
          </div>
        </SettingRow>

        <SettingRow label="Cache and Static Resource Optimization" tooltipText="By configuring cache and optimizing the delivery of static resources, you can reduce the number of requests that web server directly handles on the backend.">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localSettings.cacheOptimizationEnabled || false}
                onChange={(e) => handleLocalChange('cacheOptimizationEnabled', null, e.target.checked, 'checkbox')}
              />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
            <span className="ml-3 text-sm text-gray-300">
              {localSettings.cacheOptimizationEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </SettingRow>

        <SettingRow label="Use HTTP Request Queue" tooltipText="With the ngx_http_limit_req_module module, you can put incoming requests into a queue.">
           <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={localSettings.httpRequestQueueEnabled || false}
                onChange={(e) => handleLocalChange('httpRequestQueueEnabled', null, e.target.checked, 'checkbox')}
              />
              <div className="w-10 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
            <span className="ml-3 text-sm text-gray-300">
              {localSettings.httpRequestQueueEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </SettingRow>
        
        <div className="mt-6 pt-4 border-t border-white/10">
          <SettingRow label="GeoIP Update Frequency" tooltipText={null}>
            <select
              value={localSettings.geoIpUpdateFrequency || 'Daily'}
              onChange={(e) => handleLocalChange('geoIpUpdateFrequency', null, e.target.value, 'text')}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-sm text-white focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="Set manually">Set manually</option>
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </SettingRow>

          {localSettings.geoIpUpdateFrequency === 'Set manually' && (
            <SettingRow label="Manual Update Frequency (hours)" tooltipText="Enter the update interval in hours.">
              <InputField
                label="" 
                type="number"
                min="1"
                value={localSettings.geoIpManualHours}
                onChange={(e) => handleLocalChange('geoIpManualHours', null, e.target.value, 'number')}
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
