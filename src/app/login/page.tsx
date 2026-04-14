import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { from } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          법인차량 관리 시스템
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          MS365 사내 계정으로 로그인하세요.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", {
              redirectTo: from || "/",
            });
          }}
        >
          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-md transition"
          >
            Microsoft 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
