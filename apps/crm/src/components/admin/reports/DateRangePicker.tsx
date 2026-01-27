"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRangePickerProps = {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
};

type PresetOption = {
  label: string;
  getValue: () => { startDate: Date; endDate: Date };
};

const presets: PresetOption[] = [
  {
    label: "Last 7 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { startDate: start, endDate: end };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: end };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { startDate: start, endDate: end };
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: start, endDate: end };
    },
  },
  {
    label: "This quarter",
    getValue: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { startDate: start, endDate: now };
    },
  },
  {
    label: "This year",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start, endDate: now };
    },
  },
];

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(formatDateForInput(startDate));
  const [customEnd, setCustomEnd] = useState(formatDateForInput(endDate));
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCustomStart(formatDateForInput(startDate));
    setCustomEnd(formatDateForInput(endDate));
  }, [startDate, endDate]);

  const handlePresetClick = (preset: PresetOption) => {
    const { startDate: newStart, endDate: newEnd } = preset.getValue();
    onChange(newStart, newEnd);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const newStart = new Date(customStart);
    const newEnd = new Date(customEnd);
    if (!isNaN(newStart.getTime()) && !isNaN(newEnd.getTime())) {
      onChange(newStart, newEnd);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Calendar className="w-4 h-4" />
        <span>{formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider px-2 py-1">
              Quick Select
            </div>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="px-3 py-2 text-sm text-left rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--foreground)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
              Custom Range
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Start</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">End</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={handleCustomApply}>
              Apply Custom Range
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
