import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AnalystLayout({ children }: { children: React.ReactNode }) {
  // Middleware guarantees session exists and role is "analyst" or "admin" here
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={session?.role ?? "analyst"} email={session?.email ?? ""} />
      <main className="flex-1 px-8 py-7 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
