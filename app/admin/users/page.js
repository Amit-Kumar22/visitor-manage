import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/serverAuth";
import { isAdmin } from "@/lib/roles";
import Sidebar from "@/components/Sidebar";
import UserManagement from "@/components/UserManagement";

export default async function UsersPage() {
  const auth = await getServerAuth();

  if (!auth) {
    redirect("/admin/login");
  }
  // Guards have no access to account management — send them back to the
  // dashboard instead of showing an empty/broken page.
  if (!isAdmin(auth)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-100 md:flex-row">
      <Sidebar user={auth} />
      <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6">
        <UserManagement currentUserId={auth.userId} />
      </main>
    </div>
  );
}
