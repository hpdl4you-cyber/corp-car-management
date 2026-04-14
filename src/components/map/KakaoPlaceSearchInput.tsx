"use client";

import { useState, useRef, useEffect } from "react";

// Window.kakao global type is declared in KakaoMap.tsx

type KakaoPlace = {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
};

function loadKakaoSdk(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.kakao?.maps?.services) {
      resolve();
      return;
    }
    const scriptId = "kakao-map-sdk";
    const init = () =>
      window.kakao.maps.load(() => resolve());

    if (window.kakao?.maps && !window.kakao.maps.services) {
      // Loaded without services — can't re-load; resolve silently
      resolve();
      return;
    }
    if (document.getElementById(scriptId)) {
      const iv = setInterval(() => {
        if (window.kakao?.maps?.services) { clearInterval(iv); resolve(); }
      }, 100);
      return;
    }
    const s = document.createElement("script");
    s.id = scriptId;
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  });
}

export function KakaoPlaceSearchInput({
  name,
  defaultValue,
  placeholder = "목적지를 검색하세요",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(false);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) { setSdkError(true); return; }
    loadKakaoSdk(key)
      .then(() => setSdkReady(!!window.kakao?.maps?.services))
      .catch(() => setSdkError(true));
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !sdkReady) return;
    setLoading(true);
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(query.trim(), (data, status) => {
      setLoading(false);
      if (status === window.kakao.maps.services.Status.OK) {
        setResults(data.slice(0, 8));
      } else {
        setResults([]);
      }
    });
  };

  const handleSelect = (place: KakaoPlace) => {
    const label = place.road_address_name
      ? `${place.place_name} (${place.road_address_name})`
      : `${place.place_name} (${place.address_name})`;
    setDisplay(label);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  if (sdkError) {
    // Fallback: plain text input when SDK not configured
    return (
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    );
  }

  return (
    <>
      {/* Hidden input carries the selected value for form submission */}
      <input type="hidden" name={name} value={display} />

      <div className="flex gap-2">
        <input
          readOnly
          value={display}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white cursor-pointer"
          onClick={() => setOpen(true)}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
        >
          검색
        </button>
        {display && (
          <button
            type="button"
            onClick={() => setDisplay("")}
            className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">목적지 검색</h3>
              <button
                type="button"
                onClick={() => { setOpen(false); setResults([]); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                ref={queryRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                placeholder="장소명 또는 주소 입력"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loading || !sdkReady}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "검색중" : "검색"}
              </button>
            </div>

            {!sdkReady && (
              <p className="text-xs text-amber-600 mb-2">
                카카오 지도 SDK를 불러오는 중입니다…
              </p>
            )}

            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto rounded-md border border-gray-100">
              {results.length === 0 && query && !loading && (
                <li className="px-4 py-6 text-sm text-gray-400 text-center">
                  검색 결과가 없습니다.
                </li>
              )}
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                    onClick={() => handleSelect(place)}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {place.place_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {place.road_address_name || place.address_name}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
