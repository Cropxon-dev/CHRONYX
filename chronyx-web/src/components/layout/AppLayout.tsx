import { useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import CollapsibleNetWorth from "./CollapsibleNetWorth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Breadcrumbs from "./Breadcrumbs";
import PageLoader from "./PageLoader";
import FloatingQuickAction from "./FloatingQuickAction";

const AppLayout = () => {
  const [isNetWorthCollapsed, setIsNetWorthCollapsed] = useState(false);
  const [isNetWorthPinned, setIsNetWorthPinned] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("networth-collapsed");
    const savedPinned = localStorage.getItem("networth-pinned");
    const savedSidebarCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) setIsNetWorthCollapsed(savedCollapsed === "true");
    if (savedPinned) setIsNetWorthPinned(savedPinned === "true");
    if (savedSidebarCollapsed) setIsSidebarCollapsed(savedSidebarCollapsed === "true");
    
    // Listen for sidebar collapse changes
    const handleStorageChange = () => {
      const sidebarState = localStorage.getItem("sidebar-collapsed");
      if (sidebarState) setIsSidebarCollapsed(sidebarState === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically for same-tab changes
    const interval = setInterval(() => {
      const sidebarState = localStorage.getItem("sidebar-collapsed");
      if (sidebarState && (sidebarState === "true") !== isSidebarCollapsed) {
        setIsSidebarCollapsed(sidebarState === "true");
      }
    }, 100);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [isSidebarCollapsed]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("networth-collapsed", String(isNetWorthCollapsed));
  }, [isNetWorthCollapsed]);

  useEffect(() => {
    localStorage.setItem("networth-pinned", String(isNetWorthPinned));
  }, [isNetWorthPinned]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <main className={`min-h-screen pt-14 lg:pt-0 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:ml-14" : "lg:ml-64"
        }`}>
          {/* Responsive container - full width with proper padding */}
          <div className="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <Breadcrumbs />
            
            <div className="w-full flex flex-col xl:flex-row gap-4 lg:gap-6">
              {/* Main Content - full width responsive */}
              <div className="w-full min-w-0 flex-1">
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </div>
              
              {/* Net Worth Sidebar - Hidden on mobile, visible on xl screens unless pinned */}
              {!isNetWorthPinned && (
                <div className="hidden xl:block w-60 2xl:w-72 flex-shrink-0">
                  <div className="sticky top-6">
                    <CollapsibleNetWorth 
                      isPinned={isNetWorthPinned}
                      onTogglePin={() => setIsNetWorthPinned(!isNetWorthPinned)}
                      isCollapsed={isNetWorthCollapsed}
                      onToggleCollapse={() => setIsNetWorthCollapsed(!isNetWorthCollapsed)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Pinned Net Worth - Fixed position, visible on all screen sizes when pinned */}
        {isNetWorthPinned && (
          <div className="fixed bottom-4 right-4 z-50 w-56 sm:w-64 shadow-xl">
            <CollapsibleNetWorth 
              isPinned={isNetWorthPinned}
              onTogglePin={() => setIsNetWorthPinned(!isNetWorthPinned)}
              isCollapsed={isNetWorthCollapsed}
              onToggleCollapse={() => setIsNetWorthCollapsed(!isNetWorthCollapsed)}
            />
          </div>
        )}

        {/* Floating Quick Action Button */}
        <FloatingQuickAction />
      </div>
    </ProtectedRoute>
  );
};

export default AppLayout;
