import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/serverAuth";
import Sidebar from "@/components/Sidebar";
import GuestTable from "@/components/GuestTable";

export default async function GuestsPage() {
  const auth = await getServerAuth();

  // Middleware already redirects requests with no cookie at all, but only the
  // Node.js runtime here can actually verify the JWT's signature/expiry.
  if (!auth) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-100 md:flex-row">
      <Sidebar user={auth} />
      <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6">
        <GuestTable role={auth.role} />
      </main>
    </div>
  );
}
