"use client";

import { useState } from "react";
import { VEHICLE_COLOR_PRESETS } from "@/lib/utils";
import type { Vehicle } from "@/db/schema";

export function VehicleForm({
  vehicle,
  action,
}: {
  vehicle?: Vehicle;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [color, setColor] = useState(vehicle?.colorHex ?? "#3b82f6");

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <Field label="번호판" name="plate" defaultValue={vehicle?.plate} required />
      <Field label="모델" name="model" defaultValue={vehicle?.model} required />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="연식"
          name="year"
          type="number"
          defaultValue={vehicle?.year ?? undefined}
        />
        <Field
          label="차종"
          name="vehicleType"
          defaultValue={vehicle?.vehicleType ?? ""}
          placeholder="세단, SUV 등"
        />
      </div>
      <Field
        label="소속 부서"
        name="department"
        defaultValue={vehicle?.department ?? ""}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          색상 (캘린더 표시)
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_COLOR_PRESETS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full border-2 ${
                color === c ? "border-gray-900" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-9 h-9 rounded cursor-pointer"
          />
        </div>
        <input type="hidden" name="colorHex" value={color} />
      </div>
      <Field
        label="사진 URL"
        name="photoUrl"
        defaultValue={vehicle?.photoUrl ?? ""}
        placeholder="https://..."
      />
      <Field
        label="보험 만료일"
        name="insuranceExpiry"
        type="date"
        defaultValue={vehicle?.insuranceExpiry ?? ""}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비고
        </label>
        <textarea
          name="notes"
          defaultValue={vehicle?.notes ?? ""}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-md"
      >
        저장
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}
