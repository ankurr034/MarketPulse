import React from 'react';

/**
 * Clean SVG Sparkline component to display 3-month momentum trends
 * Matches the reference image with green upwards curve or red downwards curve
 */
export default function TrendSparkline({ 
  trend = 'up', // 'up' | 'down'
  width = 64, 
  height = 20,
  className = ''
}) {
  const isUp = trend === 'up';
  const strokeColor = isUp ? '#22c55e' : '#ef4444'; // green-500 or red-500

  // Two smooth SVG paths representing realistic 3-month upward and downward momentum
  const upPath = "M 2,16 C 14,14 18,17 28,12 C 38,7 48,11 62,3";
  const downPath = "M 2,4 C 14,7 18,3 28,9 C 38,15 48,11 62,17";

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 64 20" 
        fill="none" 
        className="overflow-visible"
      >
        <path
          d={isUp ? upPath : downPath}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
