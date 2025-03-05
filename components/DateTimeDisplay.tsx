import React from "react";

interface DateTimeDisplayProps {
  dateTime: string | number | Date;
}

const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({ dateTime }) => {
  const formattedDate = new Date(dateTime).toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  return <span>{formattedDate}</span>;
};

export default DateTimeDisplay;
