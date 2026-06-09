import type { PortEntry } from "../types/port";

interface StatsBarProps {
  entries: PortEntry[];
}

interface StatItem {
  label: string;
  count: number;
  color: string;
  dot: string;
}

export function StatsBar({ entries }: StatsBarProps) {
  const listening   = entries.filter((e) => e.state === "Listen").length;
  const established = entries.filter((e) => e.state === "Established").length;
  const other       = entries.length - listening - established;
  const tcp         = entries.filter((e) => e.protocol === "TCP").length;
  const udp         = entries.filter((e) => e.protocol === "UDP").length;

  const stats: StatItem[] = [
    { label: "Total",       count: entries.length, color: "text-gray-700",   dot: "bg-gray-400" },
    { label: "Escuchando",  count: listening,       color: "text-green-700",  dot: "bg-green-500" },
    { label: "Establecido", count: established,     color: "text-blue-700",   dot: "bg-blue-500" },
    { label: "Otros",       count: other,           color: "text-amber-700",  dot: "bg-amber-400" },
    { label: "TCP",         count: tcp,             color: "text-indigo-700", dot: "bg-indigo-400" },
    { label: "UDP",         count: udp,             color: "text-teal-700",   dot: "bg-teal-400" },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          {i > 0 && <div className="w-px h-4 bg-gray-200 shrink-0" />}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
            <span className="text-xs text-gray-500">{s.label}</span>
            <span className={`text-xs font-semibold ${s.color}`}>{s.count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
