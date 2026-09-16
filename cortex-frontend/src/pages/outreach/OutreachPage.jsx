import { useEffect, useState, useCallback } from 'react';
import { Search, Send, Mail, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Spinner, EmptyState } from '../../components/ui/DataDisplay';
import { Modal } from '../../components/ui/Overlay';
import { Input } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { outreachApi } from '../../api/backlinks';

const STATUS_TONE = {
  new: 'neutral', queued: 'warning', contacted: 'navy', replied: 'success', accepted: 'success', rejected: 'danger', bounced: 'danger',
};

export default function OutreachPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();

  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [findModalOpen, setFindModalOpen] = useState(false);
  const [findForm, setFindForm] = useState({ niche: '', prospectTypes: ['guest_post', 'resource_page'] });
  const [finding, setFinding] = useState(false);

  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ contact_email: '', contact_name: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const { data } = await outreachApi.list(workspaceId, siteId);
      setProspects(data.data.prospects || []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, siteId]);

  useEffect(() => { load(); }, [load]);

  async function handleFind(e) {
    e.preventDefault();
    setFinding(true);
    try {
      const { data } = await outreachApi.findProspects(workspaceId, siteId, findForm);
      push(data.message);
      setFindModalOpen(false);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Prospect search failed.', 'error');
    } finally {
      setFinding(false);
    }
  }

  function openEdit(prospect) {
    setEditModal(prospect);
    setEditForm({ contact_email: prospect.contact_email || '', contact_name: prospect.contact_name || '' });
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await outreachApi.update(workspaceId, siteId, editModal._id, editForm);
      push('Contact details saved.');
      setEditModal(null);
      load();
    } catch {
      push('Could not save contact details.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(prospect) {
    try {
      await outreachApi.queueOutreach(workspaceId, siteId, prospect._id, {});
      push(`Outreach email queued for ${prospect.domain}.`);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Add a contact email first.', 'error');
    }
  }

  const columns = [
    { key: 'domain', header: 'Domain' },
    { key: 'prospect_type', header: 'Type', render: (r) => <Badge tone="neutral">{r.prospect_type.replace('_', ' ')}</Badge> },
    { key: 'contact_email', header: 'Contact', render: (r) => r.contact_email || <span className="text-slate/50 text-xs">Not set</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit contact</Button>
          <Button size="sm" icon={Send} onClick={() => handleSend(r)} disabled={r.status !== 'new'}>Send</Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Outreach">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate max-w-lg">
            Link-building prospects for {currentSite?.domain} — discover candidates, add contacts, send outreach.
          </p>
          <Button icon={Search} onClick={() => setFindModalOpen(true)}>Find prospects</Button>
        </div>

        <Card padding="p-0">
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner size={24} /></div>
            ) : prospects.length === 0 ? (
              <EmptyState icon={Users} message="No prospects yet" hint='Click "Find prospects" and enter a niche to discover guest-post and resource-page candidates.' />
            ) : (
              <Table columns={columns} rows={prospects} keyField="_id" />
            )}
          </div>
        </Card>

        <Modal open={findModalOpen} onClose={() => setFindModalOpen(false)} title="Find link-building prospects">
          <form onSubmit={handleFind} className="space-y-4">
            <Input
              label="Niche / topic"
              required
              placeholder="e.g. data recovery"
              value={findForm.niche}
              onChange={(e) => setFindForm({ ...findForm, niche: e.target.value })}
            />
            <p className="text-xs text-slate">
              Searches for guest-post and resource-page candidates using footprint queries. Results are directional — you'll still need to find each contact's email.
            </p>
            <Button type="submit" loading={finding} className="w-full justify-center">Search</Button>
          </form>
        </Modal>

        <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Contact for ${editModal?.domain}`}>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <Input
              label="Contact name"
              value={editForm.contact_name}
              onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
            />
            <Input
              label="Contact email"
              type="email"
              value={editForm.contact_email}
              onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
              placeholder="editor@example.com"
            />
            <Button type="submit" loading={saving} icon={Mail} className="w-full justify-center">Save contact</Button>
          </form>
        </Modal>
      </RequireSite>
    </DashboardLayout>
  );
}
