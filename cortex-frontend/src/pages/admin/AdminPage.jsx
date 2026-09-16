import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, ShieldOff, Eye, UserCog } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Spinner, EmptyState } from '../../components/ui/DataDisplay';
import { Tabs, Modal } from '../../components/ui/Overlay';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';

export default function AdminPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [sitesModal, setSitesModal] = useState(null);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, w] = await Promise.allSettled([adminApi.listUsers(), adminApi.listWorkspaces()]);
    if (u.status === 'fulfilled') setUsers(u.value.data.data.users || []);
    if (w.status === 'fulfilled') setWorkspaces(w.value.data.data.workspaces || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (user && !user.user?.is_platform_admin) {
    return <Navigate to="/" replace />;
  }

  async function toggleAdmin(targetUser) {
    if (targetUser.id === user?.user?.id && targetUser.is_platform_admin) {
      push("You can't remove your own admin access — have another admin do it.", 'error');
      return;
    }
    setUpdatingId(targetUser.id);
    try {
      await adminApi.updateUser(targetUser.id, { is_platform_admin: !targetUser.is_platform_admin });
      push(`${targetUser.email} is ${!targetUser.is_platform_admin ? 'now' : 'no longer'} a platform admin.`);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Could not update user.', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleActive(targetUser) {
    setUpdatingId(targetUser.id);
    try {
      await adminApi.updateUser(targetUser.id, { is_active: !targetUser.is_active });
      push(`${targetUser.email} is now ${!targetUser.is_active ? 'active' : 'disabled'}.`);
      load();
    } catch {
      push('Could not update user.', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function openSites(workspace) {
    setSitesModal(workspace);
    setSitesLoading(true);
    try {
      const { data } = await adminApi.listWorkspaceSites(workspace.id);
      setSites(data.data.sites || []);
    } catch {
      push('Could not load sites for this workspace.', 'error');
    } finally {
      setSitesLoading(false);
    }
  }

  const userColumns = [
    { key: 'name', header: 'User', render: (r) => (
      <div>
        <div className="font-medium text-navy">{r.name}</div>
        <div className="text-xs text-slate font-mono">{r.email}</div>
      </div>
    ) },
    { key: 'is_active', header: 'Status', render: (r) => <Badge tone={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Disabled'}</Badge> },
    { key: 'is_platform_admin', header: 'Admin?', render: (r) => <Badge tone={r.is_platform_admin ? 'teal' : 'neutral'}>{r.is_platform_admin ? 'Admin' : 'Regular user'}</Badge> },
    { key: 'last_login_at', header: 'Last login', render: (r) => r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : 'Never' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={r.is_platform_admin ? ShieldOff : ShieldCheck} loading={updatingId === r.id} onClick={() => toggleAdmin(r)}>
            {r.is_platform_admin ? 'Revoke admin' : 'Make admin'}
          </Button>
          <Button size="sm" variant={r.is_active ? 'danger' : 'ghost'} loading={updatingId === r.id} onClick={() => toggleActive(r)}>
            {r.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  const workspaceColumns = [
    { key: 'name', header: 'Workspace' },
    { key: 'owner', header: 'Owner', render: (r) => <span className="text-xs font-mono">{r.owner?.email}</span> },
    { key: 'plan', header: 'Plan', render: (r) => <Badge tone="navy">{r.plan}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (r) => <Button size="sm" variant="ghost" icon={Eye} onClick={() => openSites(r)}>View sites</Button>,
    },
  ];

  return (
    <DashboardLayout title="Platform Admin">
      <div className="flex items-center gap-2 mb-5">
        <UserCog size={18} className="text-teal-deep" />
        <p className="text-sm text-slate max-w-lg">
          Oversight across every user and workspace on the platform. Ordinary users never see this — each is fully isolated to their own workspace.
        </p>
      </div>

      <Card padding="p-0">
        <div className="px-5 pt-5">
          <Tabs
            tabs={[
              { key: 'users', label: `Users (${users.length})` },
              { key: 'workspaces', label: `Workspaces (${workspaces.length})` },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={24} /></div>
          ) : tab === 'users' ? (
            <Table columns={userColumns} rows={users} emptyMessage="No users yet." />
          ) : (
            <Table columns={workspaceColumns} rows={workspaces} emptyMessage="No workspaces yet." />
          )}
        </div>
      </Card>

      <Modal open={!!sitesModal} onClose={() => setSitesModal(null)} title={`Sites in ${sitesModal?.name}`} width="max-w-2xl">
        {sitesLoading ? (
          <div className="flex justify-center py-10"><Spinner size={22} /></div>
        ) : sites.length === 0 ? (
          <EmptyState message="No sites tracked in this workspace yet." />
        ) : (
          <div className="space-y-2">
            {sites.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-slate/15 rounded-lg text-sm">
                <span className="font-medium text-navy">{s.display_name || s.domain}</span>
                <Badge tone="neutral">{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
