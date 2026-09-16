import { useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const { sites, siteId, selectSite, currentSite } = useWorkspace();
  const [siteOpen, setSiteOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate/15 bg-white flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="font-display font-semibold text-navy text-[17px]">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setSiteOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate/20 text-sm font-medium text-navy hover:border-teal-deep transition"
          >
            <span className="w-2 h-2 rounded-full bg-teal-deep flex-shrink-0" />
            {currentSite ? currentSite.domain : sites.length === 0 ? 'No sites yet' : 'Select a site'}
            <ChevronDown size={14} className="text-slate" />
          </button>
          {siteOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate/15 rounded-lg shadow-lift py-1.5 z-40">
              {sites.length === 0 && (
                <div className="px-3.5 py-2.5 text-xs text-slate">Add a site under "All Sites" first.</div>
              )}
              {sites.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    selectSite(s.id);
                    setSiteOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm hover:bg-teal-soft transition ${
                    s.id === siteId ? 'text-teal-deep font-medium' : 'text-navy'
                  }`}
                >
                  {s.domain}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-navy text-teal flex items-center justify-center font-mono text-xs font-bold hover:bg-navy-light transition"
          >
            {user?.user?.name?.[0]?.toUpperCase() || <User size={15} />}
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate/15 rounded-lg shadow-lift py-1.5 z-40">
              <div className="px-3.5 py-2 border-b border-slate/10">
                <div className="text-sm font-medium text-navy truncate">{user?.user?.name}</div>
                <div className="text-xs text-slate truncate">{user?.user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
