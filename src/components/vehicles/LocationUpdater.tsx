"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLastLocation } from "@/actions/locations";
import { formatDateTime } from "@/lib/utils";

export function LocationUpdater({
  vehicleId,
  lastLat,
  lastLng,
  lastText,
  lastUpdatedAt,
}: {
  vehicleId: string;
  lastLat: number | null;
  lastLng: number | null;
  lastText: string | null;
  lastUpdatedAt: Date | null;
}) {
  const router = useRouter();
  const [lat, setLat] = useState<string>(lastLat?.toString() ?? "");
  const [lng, setLng] = useState<string>(lastLng?.toString() ?? "");
  const [text, setText] = useState<string>(lastText ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const fd = new FormData();
    fd.append("vehicleId", vehicleId);
    fd.append("lat", lat);
    fd.append("lng", lng);
    fd.append("text", text);
    try {
      await updateLastLocation(fd);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function useGeolocation() {
    if (!navigator.geolocation) {
      setError("브라우저가 위치 정보를 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
      },
      (err) => setError(err.message),
    );
  }

  if (!editing) {
    return (
      <div className="text-sm space-y-2">
        {lastLat && lastLng ? (
          <>
            <div>
              <span className="text-gray-500">좌표: </span>
              {lastLat.toFixed(6)}, {lastLng.toFixed(6)}
            </div>
            {lastText && (
              <div>
                <span className="text-gray-500">주소: </span>
                {lastText}
              </div>
            )}
            {lastUpdatedAt && (
              <div className="text-xs text-gray-400">
                업데이트: {formatDateTime(lastUpdatedAt)}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">위치 정보가 없습니다.</p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-brand-600 hover:underline"
        >
          위치 업데이트
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          step="any"
          placeholder="위도"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5"
        />
        <input
          type="number"
          step="any"
          placeholder="경도"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5"
        />
      </div>
      <input
        placeholder="주소/장소 메모"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1.5"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={useGeolocation}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded"
        >
          현재 위치 사용
        </button>
        <button
          type="button"
          onClick={submit}
          className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-gray-500 px-3 py-1.5"
        >
          취소
        </button>
      </div>
    </div>
  );
}
