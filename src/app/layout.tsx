import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getOptionalUser } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "법인차량 관리 시스템",
  description: "법인차량 등록, 예약, 운행 관리",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css"
        />
      </head>
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar user={user} />
            <main className="flex-1 overflow-x-hidden bg-white">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}
