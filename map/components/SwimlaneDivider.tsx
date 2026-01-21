'use client';

interface SwimlaneDividerProps {
  data: {
    width: number;
  };
}

export default function SwimlaneDivider({ data }: SwimlaneDividerProps) {
  return (
    <div
      className="border-t border-dashed border-gray-300"
      style={{ width: data.width }}
    />
  );
}
