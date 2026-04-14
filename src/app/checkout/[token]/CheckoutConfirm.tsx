"use client";

import { useState } from "react";
import { performCheckout } from "@/actions/checkin";

const LOCATIONS = ["창원본사", "부산연구소"] as const;

export function CheckoutConfirm({ token }: { token: string }) {
  const [location, setLocation] = useState<string>(LOCATIONS[0]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await performCheckout(token, location);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">🏁</div>
        <p className="text-lg font-semibold text-green-700">체크아웃 완료!</p>
        <p className="text-sm text-gray-500 mt-1">
          반납 장소: <strong>{location}</strong>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-center text-gray-700 font-medium mb-5">
        체크아웃 하시겠습니까?
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          반납 장소
        </label>
        <div className="grid grid-cols-2 gap-3">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                location === loc
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => window.close()}
          className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "처리 중..." : "확인"}
        </button>
      </div>
    </div>
  );
}
