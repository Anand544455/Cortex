import { useEffect, useState, useCallback } from 'react';
import { Plus, Send, RefreshCw, AtSign, Share2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Spinner, EmptyState } from '../../components/ui/DataDisplay';
import { Tabs, Modal } from '../../components/ui/Overlay';
import { Input, Textarea, Select } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { smoApi } from '../../api/smo';

const STATUS_TONE = { draft: 'neutral', queued: 'warning', posted: 'success', failed: 'danger' };

export default function SmoPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('posts');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ platform: 'linkedin', content: '', link_url: '', scheduled_at: '' });
  const [saving, setSaving] = useState(false);
  const [syndicating, setSyndicating] = useState(false);

  const [brandName, setBrandName] = useState('');
  const [mentions, setMentions] = useState([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const { data } = await smoApi.listPosts(workspaceId, siteId);
      setPosts(data.data.posts || []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, siteId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await smoApi.createPost(workspaceId, siteId, form);
      push('Post drafted.');
      setModalOpen(false);
      setForm({ platform: 'linkedin', content: '', link_url: '', scheduled_at: '' });
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Could not draft post.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleQueue(post) {
    try {
      await smoApi.queuePost(workspaceId, siteId, post._id);
      push('Post queued for publishing.');
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Configure SMO_PUBLISH_WEBHOOK_URL on the backend first.', 'error');
    }
  }

  async function handleSyndicate() {
    setSyndicating(true);
    try {
      const { data } = await smoApi.syndicate(workspaceId, siteId);
      push(`Drafted ${data.data.draftedCount} post(s) from recently crawled articles.`);
      load();
    } catch {
      push('Syndication scan failed.', 'error');
    } finally {
      setSyndicating(false);
    }
  }

  async function handleMentions(e) {
    e.preventDefault();
    if (!brandName.trim()) return;
    setMentionsLoading(true);
    try {
      const { data } = await smoApi.mentions(workspaceId, siteId, { brandName: brandName.trim() });
      setMentions(data.data.mentions || []);
    } catch {
      push('Mention search failed.', 'error');
    } finally {
      setMentionsLoading(false);
    }
  }

  const columns = [
    { key: 'platform', header: 'Platform', render: (r) => <Badge tone="navy">{r.platform}</Badge> },
    { key: 'content', header: 'Content', render: (r) => <span className="text-xs">{r.content.slice(0, 80)}…</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
    { key: 'scheduled_at', header: 'Scheduled', render: (r) => new Date(r.scheduled_at).toLocaleString() },
    {
      key: 'actions',
      header: '',
      render: (r) => r.status === 'draft' ? <Button size="sm" icon={Send} onClick={() => handleQueue(r)}>Queue</Button> : null,
    },
  ];

  return (
    <DashboardLayout title="SMO Suite">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-sm text-slate max-w-md">
            Social scheduling and listening for {currentSite?.domain}.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" icon={RefreshCw} loading={syndicating} onClick={handleSyndicate}>Auto-syndicate articles</Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>New post</Button>
          </div>
        </div>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs tabs={[{ key: 'posts', label: `Posts (${posts.length})` }, { key: 'mentions', label: 'Mentions' }]} active={tab} onChange={setTab} />
          </div>
          <div className="p-5">
            {tab === 'posts' && (
              loading ? <div className="flex justify-center py-16"><Spinner size={24} /></div>
                : <Table columns={columns} rows={posts} keyField="_id" emptyMessage="No posts drafted yet." />
            )}

            {tab === 'mentions' && (
              <div>
                <form onSubmit={handleMentions} className="flex gap-2 mb-5 max-w-md">
                  <Input placeholder="Brand or business name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                  <Button type="submit" loading={mentionsLoading} icon={AtSign}>Search</Button>
                </form>
                {mentions.length === 0 ? (
                  <EmptyState icon={Share2} message="No mentions searched yet" hint="Finds public, indexed mentions via search — not a full listening API." />
                ) : (
                  <div className="space-y-2">
                    {mentions.map((m, i) => (
                      <a key={i} href={m.post_url} target="_blank" rel="noreferrer" className="block p-3 border border-slate/15 rounded-lg hover:border-teal-deep transition text-sm">
                        <Badge tone="neutral">{m.platform}</Badge>
                        <div className="text-navy mt-1.5 truncate">{m.page_title}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Draft a social post">
          <form onSubmit={handleCreate} className="space-y-4">
            <Select label="Platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="linkedin">LinkedIn</option>
              <option value="x">X</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="pinterest">Pinterest</option>
            </Select>
            <Textarea label="Content" required rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <Input label="Link URL (optional)" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            <Input label="Scheduled at" type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            <Button type="submit" loading={saving} className="w-full justify-center">Save draft</Button>
          </form>
        </Modal>
      </RequireSite>
    </DashboardLayout>
  );
}
