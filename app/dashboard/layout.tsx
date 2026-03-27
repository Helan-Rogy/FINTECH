import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "analyst" || session.role === "admin") redirect("/analyst");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={session.role} email={session.email} />
      <main className="flex-1 px-8 py-7 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
