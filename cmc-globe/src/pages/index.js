import Head from "next/head";
import React, { useState, useCallback } from 'react'; // Added useCallback
// import Image from "next/image"; // No longer directly used here
import Globe from "@/components/Globe";
import UIFrame from "@/components/UIFrame";
// import IconButton from "@/components/IconButton"; // No longer directly used here

export default function Home() {
  const [countryUpdate, setCountryUpdate] = useState(null);

  // isInitial is true if this is part of the initial load from localStorage
  const handleBlacklistCountryOnPage = useCallback((countryCode, countryName, isInitial = false) => {
    console.log(`Page: Blacklist action for ${countryName} (${countryCode}), initial: ${isInitial}`);
    setCountryUpdate({ type: 'blacklist', code: countryCode, name: countryName, timestamp: Date.now(), isInitial });
  }, []); // setCountryUpdate is stable, so dependencies can be empty

  const handleUnblacklistCountryOnPage = useCallback((countryCode, countryName) => { 
    console.log(`Page: Unblacklist action for ${countryName} (${countryCode}) received.`);
    setCountryUpdate({ type: 'unblacklist', code: countryCode, name: countryName, timestamp: Date.now() });
  }, []); // setCountryUpdate is stable

  return (
    <>
      <Head>
        <title>CMC 3D Globe</title>
        <meta name="description" content="Interactive 3D Globe with Three.js and Next.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/next.svg" type="image/svg+xml" /> {/* Updated favicon */}
      </Head>
      <UIFrame 
        onBlacklistCountryCallback={handleBlacklistCountryOnPage}
        onUnblacklistCountryCallback={handleUnblacklistCountryOnPage} 
      >
        {/* The Globe component is the primary child of UIFrame */}
        <div className="absolute inset-0 z-0"> {/* Container for Globe */}
          <Globe 
            countryUpdate={countryUpdate} // Pass a single update object
          />
        </div>
      </UIFrame>
    </>
  );
}
