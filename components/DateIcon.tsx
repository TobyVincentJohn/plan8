import React from 'react';

interface DateIconProps {
  month: string; // 3-letter month abbreviation (e.g., "Jun", "Dec")
  date: string;  // 2-digit date (e.g., "15", "01")
  className?: string;
}

const DateIcon: React.FC<DateIconProps> = ({ month, date, className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className="text-xs font-medium leading-none text-current">{month}</span>
      <span className="text-lg font-bold leading-none text-current">{date}</span>
    </div>
  );
};

export default DateIcon;