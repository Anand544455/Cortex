import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function SettingsPage() {
  const { user } = useAuth();
  const { workspaceId, workspaces, selectWorkspace } = useWorkspace();

  return (
    <DashboardLayout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        <Card title="Your workspaces">
          <p className="text-xs text-slate mb-3 mt-1">
            Every workspace is private to your account only — there's no team-invite feature, so your data is never shared with another user.
          </p>
          <div className="space-y-2">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => selectWorkspace(w.id)}
                className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition ${
                  w.id === workspaceId ? 'border-teal-deep bg-teal-soft' : 'border-slate/15 hover:border-teal-deep'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-navy">{w.name}</div>
                  <div className="text-xs text-slate capitalize">{w.plan} plan</div>
                </div>
                <Badge tone="navy">{w.role}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Account">
          <div className="flex items-center gap-3 mt-1">
            <div className="w-11 h-11 rounded-full bg-navy text-teal flex items-center justify-center font-mono font-bold">
              {user?.user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-navy">{user?.user?.name}</div>
              <div className="text-xs text-slate">{user?.user?.email}</div>
              {user?.user?.is_platform_admin && <Badge tone="teal" className="mt-1.5">Platform Admin</Badge>}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
