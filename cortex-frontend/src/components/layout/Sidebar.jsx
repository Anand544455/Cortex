import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Globe, Radar, Search, Link2, Send, FileText, Sparkles,
  Share2, MapPin, Users, BarChart3, Settings, Brain, ShieldCheck, Plug,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Command Center', icon: LayoutGrid, end: true }],
  },
  {
    label: 'Sites',
    items: [{ to: '/sites', label: 'All Sites', icon: Globe }],
  },
  {
    label: 'Modules',
    items: [
      { to: '/crawl', label: 'Crawl & Technical', icon: Radar },
      { to: '/keywords', label: 'Keyword Intelligence', icon: Search },
      { to: '/backlinks', label: 'Backlink Engine', icon: Link2 },
      { to: '/outreach', label: 'Outreach', icon: Send },
      { to: '/content', label: 'Content Studio', icon: FileText },
      { to: '/aeo', label: 'AEO / GEO Lab', icon: Sparkles },
      { to: '/smo', label: 'SMO Suite', icon: Share2 },
      { to: '/local', label: 'Local SEO', icon: MapPin },
      { to: '/competitors', label: 'Competitor Intel', icon: Users },
      { to: '/reports', label: 'Reporting', icon: BarChart3 },
      { to: '/integrations', label: 'Integrations', icon: Plug },
      { to: '/agent', label: 'Agent', icon: Brain },
    ],
  },
  {
    label: 'Workspace',
    items: [{ to: '/settings', label: 'Settings & Team', icon: Settings }],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.user?.is_platform_admin;

  const navGroups = [
    ...NAV_GROUPS,
    ...(isAdmin
      ? [{ label: 'Platform', items: [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] }]
      : []),
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-ink text-white h-screen sticky top-0 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal to-teal-deep flex items-center justify-center flex-shrink-0">
          <Brain size={15} className="text-ink" />
        </div>
        <span className="font-display font-bold text-[17px] tracking-tight">CORTEX</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-white/35">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-deep/15 text-teal'
                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={16} className="flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 text-[10.5px] font-mono text-white/30">
        CORTEX v0.1 · All 6 phases
      </div>
    </aside>
  );
}
