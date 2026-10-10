import { Outlet, NavLink } from "react-router-dom"
import { Layers, LayoutDashboard, Globe, Wand2, FileCode2, Zap, Beaker, ShieldAlert, Activity, Settings, Bell, Search } from "lucide-react"

export default function AppShell() {
  const navItems = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Websites", icon: Globe, path: "/websites" },
    { label: "Visual Editor", icon: Wand2, path: "/editor/demo" },
    { label: "Patches", icon: FileCode2, path: "/patches" },
    { label: "Releases", icon: Zap, path: "/releases" },
    { label: "Test Runs", icon: Beaker, path: "/tests" },
    { label: "Conflicts", icon: ShieldAlert, path: "/conflicts" },
    { label: "Audit Trail", icon: Activity, path: "/audit" },
  ]

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-slate-100 font-semibold text-lg gap-2 tracking-tight">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>PATCHWORK</span>
        </div>
        
        <div className="px-4 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
          StrawHats Workspace
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              JH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">John Doe</p>
              <p className="text-xs text-slate-500 truncate">Settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="font-medium text-slate-900">StrawHats Workspace</span>
            <span className="text-slate-300">/</span>
            <span>App</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded">
              DEMO ENVIRONMENT
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Bell className="w-4 h-4" />
            </button>
            <button className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
              New Patch
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}