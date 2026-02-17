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
              ? "bg-teal-600 text-white"
              : "bg-[#1a1f2e] text-gray-400 hover:bg-[#232a3b] hover:text-gray-100"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
