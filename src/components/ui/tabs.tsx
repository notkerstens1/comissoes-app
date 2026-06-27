"use client";

import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition",
            activeTab === tab.key
              ? "bg-liv-teal text-liv-bg"
              : "bg-liv-surface text-liv-muted hover:bg-liv-surface-2 hover:text-liv-ink"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
