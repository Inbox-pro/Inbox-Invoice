import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.ts';
import { FatooraLogo } from '../ui/Primitives.tsx';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/invoices', label: 'Invoices', icon: FileText },
      { to: '/credit-notes', label: 'Credit Notes', icon: ReceiptText },
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/products', label: 'Products & Services', icon: Package },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/vat-summary', label: 'VAT Summary', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', label: 'Company Settings', icon: Settings },
      { to: '/settings?tab=account', label: 'My Account', icon: UserCircle },
      { to: '/settings?tab=team', label: 'Team Members', icon: Users },
    ],
  },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, company, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || 'F'}${user?.lastName?.[0] || ''}`.toUpperCase();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAFAF9] border-r border-[#E7E5E4]">
      <div className="px-5 pt-5 pb-4 border-b border-[#F0EEEC]">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-left cursor-pointer"
          >
            <FatooraLogo size="md" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden absolute -right-3 -top-3 p-1.5 rounded-md text-[#78716C] hover:bg-[#F5F5F4]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {company && (
          <div className="mt-3 px-2.5 py-2 rounded-md bg-white border border-[#E7E5E4]">
            <p className="text-xs font-semibold text-[#1C1917] truncate">
              {company.nameEn}
            </p>
            <p className="text-[11px] text-[#78716C] tabular-nums truncate mt-0.5">
              {company.trn ? `TRN ${company.trn}` : `${company.emirate || 'Dubai'}, UAE`}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold tracking-wider text-[#A8A29E] uppercase px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isSettingsQuery = item.to.includes('?tab=');
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/settings' || item.to === '/dashboard'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => {
                      const active = isActive && !isSettingsQuery;
                      return `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                        active
                          ? 'bg-[#FFF3ED] text-[#F26522]'
                          : 'text-[#44403C] hover:bg-[#F5F5F4] hover:text-[#1C1917]'
                      }`;
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[#E7E5E4] bg-[#FAFAF9]">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-[#FFF3ED] text-[#F26522] font-semibold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#1C1917] truncate">
              {user ? `${user.firstName} ${user.lastName}`.trim() : 'Account'}
            </p>
            <p className="text-[11px] text-[#78716C] truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-md text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#DC2626] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="w-[260px] max-w-[82vw] h-full">{sidebarContent}</div>
          <button
            type="button"
            aria-label="Close overlay"
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-[260px] min-w-0 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-white/95 backdrop-blur border-b border-[#E7E5E4] px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-md text-[#44403C] hover:bg-[#F5F5F4]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <FatooraLogo size="sm" />
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="p-2 -mr-2 rounded-md text-[#78716C] hover:bg-[#F5F5F4]"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
