// Defines the structure of settings that the chatbot can modify.
// This information will be part of the context provided to the Gemini AI.

export const settingTemplates = [
  {
    id: 'connectionRateLimit',
    description: 'Manages connection rate limiting. Parameters are "zoneSize" (text, e.g., "10m") and "maxConnections" (number, e.g., 10).',
    settingKey: 'connectionRateLimit', // Corresponds to the key in appSettings
    subKeys: [
      { name: 'zoneSize', type: 'text', prompt: 'What would you like to set the zone size to (e.g., "10m")?' },
      { name: 'maxConnections', type: 'number', prompt: 'What is the maximum number of connections per IP (e.g., 10)?' }
    ],
    // Example user phrasing: "Set connection limit", "Change connection rate limiting"
  },
  {
    id: 'requestRateLimit',
    description: 'Manages request rate limiting. Parameters are "zoneSize" (text, e.g., "10m"), "rate" (text, e.g., "5r/s"), "burst" (number, e.g., 10), and "noDelay" (boolean: true/false).',
    settingKey: 'requestRateLimit',
    subKeys: [
      { name: 'zoneSize', type: 'text', prompt: 'What zone size for request limiting (e.g., "10m")?' },
      { name: 'rate', type: 'text', prompt: 'What rate for request limiting (e.g., "5r/s")?' },
      { name: 'burst', type: 'number', prompt: 'What burst value (e.g., 10)?' },
      { name: 'noDelay', type: 'boolean', prompt: 'Enable "noDelay"? (true/false)' }
    ],
    // Example user phrasing: "Configure request limits", "Adjust request rate"
  },
  {
    id: 'requestTimeout',
    description: 'Manages various request timeout settings. Parameters are "keepalive" (number, seconds), "maxBodySize" (text, e.g., "1m"), "bodyTimeout" (number, seconds), and "headerTimeout" (number, seconds).',
    settingKey: 'requestTimeout',
    subKeys: [
      { name: 'keepalive', type: 'number', prompt: 'Keepalive timeout in seconds (e.g., 10)?' },
      { name: 'maxBodySize', type: 'text', prompt: 'Client max body size (e.g., "1m")?' },
      { name: 'bodyTimeout', type: 'number', prompt: 'Client body timeout in seconds (e.g., 10)?' },
      { name: 'headerTimeout', type: 'number', prompt: 'Client header timeout in seconds (e.g., 10)?' }
    ],
    // Example user phrasing: "Set timeouts", "Change request timeout settings"
  },
  {
    id: 'cacheOptimizationEnabled',
    description: 'Toggles cache and static resource optimization (boolean: true/false).',
    settingKey: 'cacheOptimizationEnabled',
    isToggle: true, // Indicates it's a direct boolean toggle
    prompt: (currentValue) => `Cache optimization is currently ${currentValue ? 'Enabled' : 'Disabled'}. Would you like to ${currentValue ? 'Disable' : 'Enable'} it? (yes/no)`
    // Example user phrasing: "Enable cache", "Toggle cache optimization"
  },
  {
    id: 'httpRequestQueueEnabled',
    description: 'Toggles the HTTP request queue (boolean: true/false).',
    settingKey: 'httpRequestQueueEnabled',
    isToggle: true,
    prompt: (currentValue) => `HTTP request queue is currently ${currentValue ? 'Enabled' : 'Disabled'}. Would you like to ${currentValue ? 'Disable' : 'Enable'} it? (yes/no)`
    // Example user phrasing: "Enable request queue", "Toggle HTTP queue"
  },
  {
    id: 'geoIpUpdateFrequency',
    description: 'Sets the GeoIP update frequency. Options are "Set manually", "Hourly", "Daily", "Weekly". If "Set manually", also requires "geoIpManualHours" (number).',
    settingKey: 'geoIpUpdateFrequency',
    subKeys: [ // Though geoIpUpdateFrequency is top-level, manualHours is conditional
      { name: 'frequency', type: 'select', options: ["Set manually", "Hourly", "Daily", "Weekly"], prompt: 'Choose GeoIP update frequency: Set manually, Hourly, Daily, or Weekly?' },
      { name: 'manualHours', type: 'number', conditionalOn: { key: 'frequency', value: 'Set manually' }, prompt: 'Update frequency in hours for manual setting (e.g., 24)?' }
    ],
    // Example user phrasing: "Change GeoIP update", "Set GeoIP frequency"
  }
];

// Helper to get a template by ID
export const getSettingTemplateById = (id) => settingTemplates.find(t => t.id === id);

// Helper to get a template by a settingKey (main key in appSettings)
export const getSettingTemplateBySettingKey = (settingKey) => settingTemplates.find(t => t.settingKey === settingKey);
