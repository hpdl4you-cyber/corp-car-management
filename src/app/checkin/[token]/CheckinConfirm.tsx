"use client";

import { useState } from "react";
import { performCheckin } from "@/actions/checkin";

export function CheckinConfirm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await performCheckin(token);
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
        <div className="text-5xl mb-4">🚗</div>
        <p className="text-lg font-semibold text-green-700">
          체크인 완료!
        </p>
        <p className="text-sm text-gray-500 mt-1">안전 운행하세요.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-center text-gray-700 font-medium mb-6">
        체크인 하시겠습니까?
      </p>
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
