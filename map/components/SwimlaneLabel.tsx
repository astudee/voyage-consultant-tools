'use client';

interface SwimlaneLabelProps {
  data: {
    letter: string;
    name: string;
  };
}

export default function SwimlaneLabel({ data }: SwimlaneLabelProps) {
  const { letter, name } = data;

  return (
    <div className="text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
      <span className="font-bold">{letter}</span>
      {name && <span className="text-gray-400 ml-1">- {name}</span>}
    </div>
  );
}
