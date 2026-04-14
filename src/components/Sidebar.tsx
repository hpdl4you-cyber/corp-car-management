import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";
import {
  Calendar,
  Car,
  LayoutDashboard,
  LogOut,
  MapPin,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/reservations", label: "예약 캘린더", icon: Calendar },
  { href: "/vehicles", label: "차량 관리", icon: Car, adminOnly: true },
  { href: "/map", label: "차량 위치", icon: MapPin },
];

export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-brand-700">법인차량 관리</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || user.role === "admin")
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="text-sm font-medium text-gray-900">{user.name}</div>
        <div className="text-xs text-gray-500 mb-3">{user.email}</div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
          >
            <LogOut size={14} /> 로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
