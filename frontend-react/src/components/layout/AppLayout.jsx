import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar  = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {sidebarOpen && (
        <div id="sidebar-overlay" className="show" onClick={closeSidebar} />
      )}

      <Topbar onToggleSidebar={openSidebar} />

      <main id="main-content">
        <Outlet />
      </main>
    </>
  );
}
