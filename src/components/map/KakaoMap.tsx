"use client";

import { useEffect, useRef } from "react";

type KakaoMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  colorHex: string;
};

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => {
          setBounds: (b: unknown) => void;
        };
        Marker: new (opts: { position: unknown; map: unknown }) => unknown;
        CustomOverlay: new (opts: {
          position: unknown;
          content: string;
          yAnchor: number;
        }) => { setMap: (m: unknown) => void };
        LatLngBounds: new () => {
          extend: (latlng: unknown) => void;
        };
        services: {
          Places: new () => {
            keywordSearch: (
              query: string,
              callback: (
                result: Array<{
                  id: string;
                  place_name: string;
                  road_address_name: string;
                  address_name: string;
                }>,
                status: string,
              ) => void,
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}

export function KakaoMap({ markers }: { markers: KakaoMarker[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) {
      if (ref.current)
        ref.current.innerHTML =
          '<div class="p-6 text-sm text-gray-500">NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.</div>';
      return;
    }
    const scriptId = "kakao-map-sdk";
    const init = () => {
      window.kakao.maps.load(() => {
        if (!ref.current) return;
        const center =
          markers.length > 0
            ? new window.kakao.maps.LatLng(markers[0].lat, markers[0].lng)
            : new window.kakao.maps.LatLng(37.5665, 126.978);
        const map = new window.kakao.maps.Map(ref.current, {
          center,
          level: 6,
        });
        const bounds = new window.kakao.maps.LatLngBounds();
        markers.forEach((m) => {
          const pos = new window.kakao.maps.LatLng(m.lat, m.lng);
          bounds.extend(pos);
          new window.kakao.maps.Marker({ position: pos, map });
          const overlay = new window.kakao.maps.CustomOverlay({
            position: pos,
            yAnchor: 2.4,
            content: `<div style="background:${m.colorHex};color:#fff;padding:2px 8px;border-radius:9999px;font-size:12px;white-space:nowrap;">${m.label}</div>`,
          });
          overlay.setMap(map);
        });
        if (markers.length > 1) map.setBounds(bounds);
      });
    };

    if (window.kakao?.maps) {
      init();
      return;
    }
    if (document.getElementById(scriptId)) {
      const i = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(i);
          init();
        }
      }, 100);
      return () => clearInterval(i);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [markers]);

  return <div ref={ref} className="w-full h-[600px] rounded-lg" />;
}
