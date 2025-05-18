import React, { useState, useEffect, useRef } from 'react';
// Removed problematic import of Flags from 'country-flag-icons/react/3x2'

// Helper for country data - ISO codes are crucial.
const countryData = {
  "Afghanistan": { id: "AF" }, "Albania": { id: "AL" }, "Algeria": { id: "DZ" }, "Andorra": { id: "AD" },
  "Angola": { id: "AO" }, "Antigua and Barbuda": { id: "AG" }, "Argentina": { id: "AR" }, "Armenia": { id: "AM" },
  "Australia": { id: "AU" }, "Austria": { id: "AT" }, "Azerbaijan": { id: "AZ" }, "Bahamas": { id: "BS" },
  "Bahrain": { id: "BH" }, "Bangladesh": { id: "BD" }, "Barbados": { id: "BB" }, "Belarus": { id: "BY" },
  "Belgium": { id: "BE" }, "Belize": { id: "BZ" }, "Benin": { id: "BJ" }, "Bhutan": { id: "BT" },
  "Bolivia": { id: "BO" }, "Bosnia and Herzegovina": { id: "BA" }, "Botswana": { id: "BW" }, "Brazil": { id: "BR" },
  "Brunei": { id: "BN" }, "Bulgaria": { id: "BG" }, "Burkina Faso": { id: "BF" }, "Burundi": { id: "BI" },
  "Cambodia": { id: "KH" }, "Cameroon": { id: "CM" }, "Canada": { id: "CA" }, "Cabo Verde": { id: "CV" },
  "Central African Republic": { id: "CF" }, "Chad": { id: "TD" }, "Chile": { id: "CL" }, "China": { id: "CN" },
  "Colombia": { id: "CO" }, "Comoros": { id: "KM" }, "Congo": { id: "CG" }, 
  "Costa Rica": { id: "CR" }, "Côte d’Ivoire": { id: "CI" }, "Croatia": { id: "HR" }, "Cuba": { id: "CU" },
  "Cyprus": { id: "CY" }, "Czechia": { id: "CZ" },
  "Democratic Republic of the Congo": { id: "CD"}, "Denmark": { id: "DK" }, "Djibouti": { id: "DJ" },
  "Dominica": { id: "DM" }, "Dominican Republic": { id: "DO" }, "Ecuador": { id: "EC" }, "Egypt": { id: "EG" },
  "El Salvador": { id: "SV" }, "Equatorial Guinea": { id: "GQ" }, "Eritrea": { id: "ER" }, "Estonia": { id: "EE" },
  "Eswatini": { id: "SZ" }, "Ethiopia": { id: "ET" }, "Fiji": { id: "FJ" }, "Finland": { id: "FI" },
  "France": { id: "FR" }, "Gabon": { id: "GA" }, "Gambia": { id: "GM" }, "Georgia": { id: "GE" },
  "Germany": { id: "DE" }, "Ghana": { id: "GH" }, "Greece": { id: "GR" }, "Grenada": { id: "GD" },
  "Guatemala": { id: "GT" }, "Guinea": { id: "GN" }, "Guinea-Bissau": { id: "GW" }, "Guyana": { id: "GY" },
  "Haiti": { id: "HT" }, "Honduras": { id: "HN" }, "Hungary": { id: "HU" }, "Iceland": { id: "IS" },
  "India": { id: "IN" }, "Indonesia": { id: "ID" }, "Iran": { id: "IR" }, "Iraq": { id: "IQ" },
  "Ireland": { id: "IE" }, "Israel": { id: "IL" }, "Italy": { id: "IT" }, "Jamaica": { id: "JM" },
  "Japan": { id: "JP" }, "Jordan": { id: "JO" }, "Kazakhstan": { id: "KZ" }, "Kenya": { id: "KE" },
  "Kiribati": { id: "KI" }, "Kuwait": { id: "KW" }, "Kyrgyzstan": { id: "KG" }, "Laos": { id: "LA" },
  "Latvia": { id: "LV" }, "Lebanon": { id: "LB" }, "Lesotho": { id: "LS" }, "Liberia": { id: "LR" },
  "Libya": { id: "LY" }, "Liechtenstein": { id: "LI" }, "Lithuania": { id: "LT" }, "Luxembourg": { id: "LU" },
  "Madagascar": { id: "MG" }, "Malawi": { id: "MW" }, "Malaysia": { id: "MY" }, "Maldives": { id: "MV" },
  "Mali": { id: "ML" }, "Malta": { id: "MT" }, "Marshall Islands": { id: "MH" }, "Mauritania": { id: "MR" },
  "Mauritius": { id: "MU" }, "Mexico": { id: "MX" }, "Micronesia": { id: "FM" }, "Monaco": { id: "MC" },
  "Mongolia": { id: "MN" }, "Montenegro": { id: "ME" }, "Morocco": { id: "MA" }, "Mozambique": { id: "MZ" },
  "Myanmar": { id: "MM" }, "Namibia": { id: "NA" }, "Nauru": { id: "NR" }, "Nepal": { id: "NP" },
  "Netherlands": { id: "NL" }, "New Zealand": { id: "NZ" }, "Nicaragua": { id: "NI" }, "Niger": { id: "NE" },
  "Nigeria": { id: "NG" }, "North Macedonia": { id: "MK" }, "Norway": { id: "NO" }, "Oman": { id: "OM" },
  "Pakistan": { id: "PK" }, "Palau": { id: "PW" }, "Panama": { id: "PA" }, "Papua New Guinea": { id: "PG" },
  "Paraguay": { id: "PY" }, "Peru": { id: "PE" }, "Philippines": { id: "PH" }, "Poland": { id: "PL" },
  "Portugal": { id: "PT" }, "Qatar": { id: "QA" }, "South Korea": { id: "KR" }, "Moldova": { id: "MD" },
  "Romania": { id: "RO" }, "Russia": { id: "RU" }, "Rwanda": { id: "RW" }, 
  "Saint Kitts and Nevis": { id: "KN" }, "Saint Lucia": { id: "LC" }, 
  "Saint Vincent and the Grenadines": { id: "VC" }, "Samoa": { id: "WS" }, "San Marino": { id: "SM" },
  "Sao Tome and Principe": { id: "ST" }, "Saudi Arabia": { id: "SA" }, "Senegal": { id: "SN" },
  "Serbia": { id: "RS" }, "Seychelles": { id: "SC" }, "Sierra Leone": { id: "SL" }, "Singapore": { id: "SG" },
  "Slovakia": { id: "SK" }, "Slovenia": { id: "SI" }, "Solomon Islands": { id: "SB" }, "Somalia": { id: "SO" },
  "South Africa": { id: "ZA" }, "South Sudan": { id: "SS" }, "Spain": { id: "ES" }, "Sri Lanka": { id: "LK" },
  "Sudan": { id: "SD" }, "Suriname": { id: "SR" }, "Sweden": { id: "SE" }, "Switzerland": { id: "CH" },
  "Syria": { id: "SY" }, "Tajikistan": { id: "TJ" }, "Thailand": { id: "TH" }, "Timor-Leste": { id: "TL" },
  "Togo": { id: "TG" }, "Tonga": { id: "TO" }, "Trinidad and Tobago": { id: "TT" }, "Tunisia": { id: "TN" },
  "Türkiye": { id: "TR" }, "Turkmenistan": { id: "TM" }, "Tuvalu": { id: "TV" }, "Uganda": { id: "UG" },
  "Ukraine": { id: "UA" }, "United Arab Emirates": { id: "AE" }, "United Kingdom": { id: "GB" },
  "Tanzania": { id: "TZ" }, "United States": { id: "US" }, "Uruguay": { id: "UY" }, "Uzbekistan": { id: "UZ" },
  "Vanuatu": { id: "VU" }, "Venezuela": { id: "VE" }, "Viet Nam": { id: "VN" }, "Yemen": { id: "YE" },
  "Zambia": { id: "ZM" }, "Zimbabwe": { id: "ZW" }
};

const initialNonBlacklistedCountries = Object.entries(countryData).map(([name, data]) => ({
    ...data,
    name,
}));

const LOCAL_STORAGE_BLACKLIST_KEY = 'globeAppBlacklist';

const loadBlacklistFromStorage = () => {
  if (typeof window !== 'undefined') {
    const storedBlacklist = localStorage.getItem(LOCAL_STORAGE_BLACKLIST_KEY);
    return storedBlacklist ? JSON.parse(storedBlacklist) : [];
  }
  return [];
};

const saveBlacklistToStorage = (blacklist) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_BLACKLIST_KEY, JSON.stringify(blacklist));
  }
};

const initialBlacklistedCountriesFromStorage = loadBlacklistFromStorage();
const initialNonBlacklistedFromScript = initialNonBlacklistedCountries.filter(
  scriptCountry => !initialBlacklistedCountriesFromStorage.find(blacklisted => blacklisted.id === scriptCountry.id)
);

const initialCountriesState = {
  "Non-blacklisted Countries": initialNonBlacklistedFromScript,
  "Blacklisted Countries": initialBlacklistedCountriesFromStorage
  // "Selected Countries": [] // Removed
};

const MenuPanel = ({ isOpen, onClose, onBlacklistCountry, onUnblacklistCountry }) => {
  const [activeTab, setActiveTab] = useState('Non-blacklisted Countries');
  const [countries, setCountries] = useState(initialCountriesState);
  const [expandedStats, setExpandedStats] = useState({}); 
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, countryId: null, countryName: "", action: null });
  const [nonBlacklistedSearchTerm, setNonBlacklistedSearchTerm] = useState(""); 
  const [blacklistedSearchTerm, setBlacklistedSearchTerm] = useState("");
  const panelRef = useRef(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const storedBlacklist = loadBlacklistFromStorage();
    // Update state based on localStorage only if it differs or on initial meaningful load
    // This effect should ideally run once to set the initial state from storage,
    // and then rely on user actions to update.
    // The key is to ensure `onBlacklistCountry` is called for Globe.js for each stored item.
    if (isOpen) { // Process only when panel becomes open to avoid premature calls
        const currentBlacklistIDs = countries["Blacklisted Countries"].map(c => c.id);
        const storedBlacklistIDs = storedBlacklist.map(c => c.id);
        
        // If the state already reflects storage, no need to re-process everything unless forced.
        // However, Globe needs to know about initial blacklisted countries.
        // This initial call to onBlacklistCountry for each stored item is crucial.
        // To prevent re-triggering Globe updates if panel re-opens without changes,
        // this could be moved to a higher component or managed with a "hydrated" flag.
        // For now, this will re-send to Globe each time panel opens if blacklist is not empty.
        storedBlacklist.forEach(country => {
            onBlacklistCountry(country.id, country.name, true); 
        });
    }
  }, [isOpen, onBlacklistCountry]); // Re-run if isOpen changes, to inform Globe on panel open.

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 10); 
      return () => clearTimeout(timer);
    } else {
      setShowContent(false); 
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenu.visible && panelRef.current && !panelRef.current.contains(event.target)) {
        if (!event.target.closest('.context-menu-item')) {
            setContextMenu({ visible: false, x: 0, y: 0, countryId: null, countryName: "", action: null });
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible]);

  if (!isOpen) return null;

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setContextMenu({ visible: false, x: 0, y: 0, countryId: null, countryName: "", action: null });
  };

  const toggleStats = (countryId) => {
    setExpandedStats(prev => ({ ...prev, [countryId]: !prev[countryId] }));
  };

  const handleRightClick = (event, country) => {
    event.preventDefault();
    console.log("handleRightClick - activeTab:", activeTab); 
    let action = activeTab === 'Blacklisted Countries' ? 'Unblacklist' : 'Blacklist';
    // Removed Selected Countries specific logic
    // if (activeTab === 'Selected Countries') {
    //     const isActuallyBlacklisted = countries["Blacklisted Countries"].find(c => c.id === country.id);
    //     action = isActuallyBlacklisted ? 'Unblacklist' : 'Blacklist';
    // }
    
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      countryId: country.id,
      countryName: country.name,
      action: action
    });
  };

  const handleContextMenuAction = () => {
    if (!contextMenu.countryId || !contextMenu.action) return;

    if (contextMenu.action === 'Blacklist') {
      const isAlreadyBlacklisted = countries["Blacklisted Countries"].find(c => c.id === contextMenu.countryId);
      if (isAlreadyBlacklisted) {
        console.warn(`Country ${contextMenu.countryName} is already blacklisted.`);
        setContextMenu({ visible: false, x: 0, y: 0, countryId: null, countryName: "", action: null });
        return;
      }

      onBlacklistCountry(contextMenu.countryId, contextMenu.countryName, false); // isInitial is false for interactive
      setCountries(prevCountries => {
        const sourceListKey = Object.keys(prevCountries).find(key => 
          prevCountries[key].find(c => c.id === contextMenu.countryId) && key !== "Blacklisted Countries"
        );
        
        if (!sourceListKey) { 
            console.error("Source list for blacklisting not found.");
            return prevCountries; 
        }

        const countryToMove = prevCountries[sourceListKey].find(c => c.id === contextMenu.countryId);
        if (!countryToMove) return prevCountries;

        const updatedSourceList = prevCountries[sourceListKey].filter(c => c.id !== contextMenu.countryId);
        const newBlacklistedList = [...prevCountries["Blacklisted Countries"], { ...countryToMove, ips: undefined, rps: undefined, volume: undefined, packets: undefined }];
        
        saveBlacklistToStorage(newBlacklistedList); 
        return {
          ...prevCountries,
          [sourceListKey]: updatedSourceList,
          "Blacklisted Countries": newBlacklistedList.sort((a,b) => a.name.localeCompare(b.name)),
        };
      });
    } else if (contextMenu.action === 'Unblacklist') {
      onUnblacklistCountry(contextMenu.countryId, contextMenu.countryName); 
      setCountries(prevCountries => {
        const countryToMove = prevCountries["Blacklisted Countries"].find(c => c.id === contextMenu.countryId);
        if (!countryToMove) return prevCountries;

        const newBlacklistedList = prevCountries["Blacklisted Countries"].filter(c => c.id !== contextMenu.countryId);
        const newNonBlacklistedList = [...prevCountries["Non-blacklisted Countries"], { ...countryToMove }];
        
        saveBlacklistToStorage(newBlacklistedList); 
        return {
          ...prevCountries,
          "Blacklisted Countries": newBlacklistedList.sort((a,b) => a.name.localeCompare(b.name)),
          "Non-blacklisted Countries": newNonBlacklistedList.sort((a, b) => a.name.localeCompare(b.name)),
        };
      });
    }
    setContextMenu({ visible: false, x: 0, y: 0, countryId: null, countryName: "", action: null });
  };

  const renderCountryItem = (country) => {
    const flagUrl = `http://purecatamphetamine.github.io/country-flag-icons/3x2/${country.id.toUpperCase()}.svg`;

    return (
      <li
        key={country.id}
        className="flex items-center justify-between py-3 px-4 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-b-0"
        onContextMenu={(e) => handleRightClick(e, country)}
      >
        <div className="flex items-center">
          <img 
            src={flagUrl} 
            alt={country.name} 
            className="w-6 h-auto mr-3 shadow-sm" 
            onError={(e) => { 
              // Optional: Fallback if image fails to load, e.g., show country code or generic icon
              e.target.style.display = 'none'; // Hide broken image
              const fallbackSpan = document.createElement('span');
              fallbackSpan.className = "mr-3 text-xl w-6 h-4 flex items-center justify-center bg-gray-700 text-gray-400 text-xs";
              fallbackSpan.textContent = country.id.toUpperCase();
              e.target.parentNode.insertBefore(fallbackSpan, e.target.nextSibling);
            }}
          />
          <span>{country.name}</span>
        </div>
        {/* Removed Selected Countries from condition */}
        {(activeTab === 'Non-blacklisted Countries') && country.rps !== undefined && (
          <button onClick={() => toggleStats(country.id)} className="p-1 text-gray-400 hover:text-white">
            {expandedStats[country.id] ? '▼' : '▶'}
          </button>
        )}
      </li>
    );
  };
  
  const renderStats = (country) => (
    <div className="bg-black/20 p-4 text-sm">
      <p><strong>Overall Stats:</strong></p>
      <p>Requests/sec: {country.rps || 'N/A'}</p>
      <p>Traffic Volume: {country.volume || 'N/A'}</p>
      <p>Packets: {country.packets || 'N/A'}</p>
      {country.ips && country.ips.length > 0 && (
        <div className="mt-2">
          <p><strong>IP Addresses:</strong></p>
          {country.ips.map(ipStat => (
            <div key={ipStat.ip} className="ml-4 mt-1 p-2 bg-black/20 rounded">
              <p>IP: {ipStat.ip}</p>
              <p>Requests/sec: {ipStat.rps}</p>
              <p>Traffic Volume: {ipStat.volume}</p>
              <p>Packets: {ipStat.packets}</p>
            </div>
          ))}
        </div>
      )}
       {!country.ips || country.ips.length === 0 && country.rps !== undefined && <p className="text-xs italic mt-1">No individual IP stats available.</p>}
    </div>
  );

  const currentSearchTerm = activeTab === 'Non-blacklisted Countries' ? nonBlacklistedSearchTerm : blacklistedSearchTerm;
  const currentCountries = (countries[activeTab] || [])
    .filter(country => country.name.toLowerCase().includes(currentSearchTerm.toLowerCase()))
    .sort((a,b) => a.name.localeCompare(b.name));
  
  const backdropBaseClasses = "fixed inset-0 flex items-center justify-center z-40 transition-all duration-300 ease-in-out";
  const panelBaseClasses = "glass-panel w-[60vw] h-[80vh] flex flex-col overflow-hidden transition-all duration-300 ease-in-out";

  return (
    <div 
      ref={panelRef}
      className={`${backdropBaseClasses} ${showContent ? 'bg-black/30 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
            onClose(); 
        }
      }}
    >
      <div 
        className={`${panelBaseClasses} ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex border-b border-white/10">
          {/* Removed 'Selected Countries' from tab list */}
          {['Blacklisted Countries', 'Non-blacklisted Countries'].map(tabName => (
            <button
              key={tabName}
              className={`px-6 py-3 text-sm font-medium transition-colors
                ${activeTab === tabName 
                  ? 'text-white bg-white/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              onClick={() => handleTabClick(tabName)}
            >
              {tabName} 
            </button>
          ))}
        </div>
        {(activeTab === 'Non-blacklisted Countries' || activeTab === 'Blacklisted Countries') && (
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="w-full p-2 bg-black/20 text-white rounded-md focus:ring-purple-500 focus:border-purple-500 placeholder-gray-500"
              value={currentSearchTerm}
              onChange={(e) => {
                if (activeTab === 'Non-blacklisted Countries') {
                  setNonBlacklistedSearchTerm(e.target.value);
                } else if (activeTab === 'Blacklisted Countries') {
                  setBlacklistedSearchTerm(e.target.value);
                }
              }}
            />
          </div>
        )}
        <div className="flex-grow overflow-y-auto">
          {currentCountries.length > 0 ? (
            <ul>
              {currentCountries.map(country => (
                <React.Fragment key={country.id}>
                  {renderCountryItem(country)}
                  {/* Removed Selected Countries from condition */}
                  {expandedStats[country.id] && (activeTab === 'Non-blacklisted Countries') && country.rps !== undefined && renderStats(country)}
                </React.Fragment>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-gray-500">No countries in this list.</p>
          )}
        </div>
      </div>

      {contextMenu.visible && (
        <div
          className="context-menu-item absolute glass-panel py-1 w-48 rounded-md shadow-xl z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleContextMenuAction}
            className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600/50"
          >
            {contextMenu.action} {contextMenu.countryName}
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuPanel;
