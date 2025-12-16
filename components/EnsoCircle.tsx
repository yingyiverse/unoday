interface EnsoCircleProps {
  size?: number;
  isUnlocked?: boolean;
  strokeWidth?: number;
  className?: string;
}

export default function EnsoCircle({
  size = 200,
  isUnlocked = true,
  strokeWidth = 2,
  className = ''
}: EnsoCircleProps) {
  const radius = (size - strokeWidth * 4) / 2;
  const center = size / 2;

  // Calculate the arc path (87% of circle, leaving 13% gap at top-right)
  // Start from top-right, sweep clockwise
  const startAngle = -50; // degrees
  const endAngle = 263; // degrees (sweep 313° = 87% of circle)

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const startX = center + radius * Math.cos(startRad);
  const startY = center + radius * Math.sin(startRad);
  const endX = center + radius * Math.cos(endRad);
  const endY = center + radius * Math.sin(endRad);

  // Large arc flag = 1 because we're drawing more than 180°
  const largeArcFlag = 1;
  const sweepFlag = 1; // Clockwise

  const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ transform: 'rotate(-90deg)' }} // Rotate to position gap at top-right
    >
      {/* Main enso stroke */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={`transition-all duration-500 ${
          isUnlocked
            ? 'opacity-100'
            : 'opacity-30'
        }`}
        style={{
          strokeDasharray: isUnlocked ? 'none' : '6 3',
        }}
      />
    </svg>
  );
}
