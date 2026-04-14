"use client";

import { useState } from "react";
import type { Vehicle } from "@/db/schema";
import { KakaoPlaceSearchInput } from "@/components/map/KakaoPlaceSearchInput";

/** Convert an ISO string to the value expected by datetime-local input (local time). */
function toLocalDateTimeInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // Round to nearest 30 minutes
  const minutes = d.getMinutes() >= 30 ? 30 : 0;
  d.setMinutes(minutes, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReservationForm({
  vehicles,
  defaultVehicleId,
  defaultStart,
  defaultEnd,
  action,
}: {
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  defaultStart?: string;
  defaultEnd?: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(defaultVehicleId ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const departureLabel = selectedVehicle?.lastReturnLocation ?? "창원본사";

  async function handle(formData: FormData) {
    setError(null);
    try {
      await action(formData);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <form action={handle} className="space-y-5 max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 차량 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          차량
        </label>
        <select
          name="vehicleId"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">선택하세요</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} · {v.model}
            </option>
          ))}
        </select>
      </div>

      {/* 시작 / 종료 — step=1800초(30분) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시작
          </label>
          <input
            type="datetime-local"
            name="startAt"
            defaultValue={toLocalDateTimeInputValue(defaultStart)}
            step={1800}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            종료
          </label>
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={toLocalDateTimeInputValue(defaultEnd)}
            step={1800}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* 출발지 — 차량의 현재 위치에서 자동 지정 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          출발지
        </label>
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
          <span className="text-base">📍</span>
          <span>{selectedVehicle ? departureLabel : "차량을 선택하면 자동으로 설정됩니다"}</span>
          {selectedVehicle && (
            <span className="ml-auto text-xs text-gray-400">차량 현재 위치</span>
          )}
        </div>
      </div>

      {/* 목적 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          목적
        </label>
        <input
          name="purpose"
          placeholder="외부 미팅, 출장 등"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {/* 목적지 — 카카오 장소 검색 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          목적지
        </label>
        <KakaoPlaceSearchInput
          name="destination"
          placeholder="목적지를 검색하세요"
        />
      </div>

      {/* 동승자 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          동승자
        </label>
        <input
          name="passengers"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-5 py-2.5 rounded-md"
      >
        예약 등록
      </button>
    </form>
  );
}
