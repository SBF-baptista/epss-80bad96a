
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppNavigation } from "./AppNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppNavigation />
        <SidebarInset className="flex-1">
          <header className="flex h-12 md:h-16 shrink-0 items-center gap-2 border-b px-2 md:px-4 sticky top-0 bg-background z-10">
            <SidebarTrigger className="-ml-1 p-2" />
            <div className="mx-1 md:mx-2 h-4 w-px bg-sidebar-border" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
                OPM - SEGSAT
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-2 md:p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
