// IconButton.js
// Glassmorphic icon button
import React from 'react';
import Image from 'next/image'; // Using Next.js Image for optimization if icons are local

const IconButton = ({ iconSrc, altText, onClick, positionClasses }) => {
  return (
    <button
      onClick={onClick}
      className={`
        ${positionClasses || 'absolute top-4 right-4'} 
        w-12 h-12 // Explicit width and height (48px)
        flex items-center justify-center // Center the icon
        p-0 // Remove padding here as flex centering handles it with fixed size
        bg-white/10
        backdrop-blur-md 
        rounded-full 
        border border-white/20 
        hover:bg-white/20 
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50
        transition-all duration-200 ease-in-out
        shadow-lg
      `}
      aria-label={altText || 'icon button'}
    >
      {/* The Image component is 24x24, it will be centered in the 48x48 button */}
      {iconSrc && (
        <Image 
          src={iconSrc} 
          alt={altText || 'icon'} 
          width={24} // Icon size
          height={24}
        />
      )}
    </button>
  );
};

export default IconButton;
