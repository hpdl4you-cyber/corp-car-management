"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export function DatePickerNav({
  selectedDate,
  displayLabel,
  prevDate,
  nextDate,
  isToday,
}: {
  selectedDate: string;
  displayLabel: string;
  prevDate: string;
  nextDate: string;
  isToday: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (date: string) => router.push(`/?date=${date}`);

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => go(prevDate)}
        className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600 font-medium"
      >
        ←
      </button>

      {/* Date display — click to open picker */}
      <div className="relative">
        <button
          onClick={() => inputRef.current?.showPicker()}
          className="px-3 py-1 rounded hover:bg-gray-100 font-medium text-gray-800 min-w-[160px] text-center"
        >
          {displayLabel}
        </button>
        {/* Hidden native date input — positioned over the button */}
        <input
          ref={inputRef}
          type="date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) go(e.target.value);
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          tabIndex={-1}
        />
      </div>

      <button
        onClick={() => go(nextDate)}
        className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600 font-medium"
      >
        →
      </button>

      {!isToday && (
        <button
          onClick={() => router.push("/")}
          className="ml-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          오늘
        </button>
      )}
    </div>
  );
}
