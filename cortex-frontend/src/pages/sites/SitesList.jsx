import { useState } from 'react';
import { Plus, Globe, Radar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, EmptyState } from '../../components/ui/DataDisplay';
import { Modal } from '../../components/ui/Overlay';
import { Input } from '../../components/ui/Form';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { siteApi } from '../../api/sites';
import { crawlApi } from '../../api/crawl';

const STATUS_TONE = {
  pending: 'neutral',
  crawling: 'warning',
  active: 'success',
  paused: 'neutral',
  error: 'danger',
};

export default function SitesList() {
  const { workspaceId, sites, sitesLoading, refreshSites, selectSite, siteId } = useWorkspace();
  const { push } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ domain: '', display_name: '' });
  const [saving, setSaving] = useState(false);
  const [crawlingIds, setCrawlingIds] = useState([]);

  async function handleAddSite(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await siteApi.create(workspaceId, form);
      push(`${form.domain} added.`);
      setModalOpen(false);
      setForm({ domain: '', display_name: '' });
      refreshSites();
    } catch (err) {
      push(err.response?.data?.message || 'Could not add site.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCrawl(site) {
    setCrawlingIds((ids) => [...ids, site.id]);
    try {
      await crawlApi.triggerCrawl(workspaceId, site.id);
      push(`Crawl queued for ${site.domain}. Check the Crawl & Technical module for progress.`);
      refreshSites();
    } catch (err) {
      push(err.response?.data?.message || 'Could not queue crawl.', 'error');
    } finally {
      setCrawlingIds((ids) => ids.filter((id) => id !== site.id));
    }
  }

  const columns = [
    {
      key: 'domain',
      header: 'Site',
      render: (row) => (
        <button onClick={() => selectSite(row.id)} className="text-left group">
          <div className={`font-medium ${row.id === siteId ? 'text-teal-deep' : 'text-navy'} group-hover:text-teal-deep`}>
            {row.display_name || row.domain}
          </div>
          <div className="text-xs text-slate font-mono">{row.domain}</div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] || 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'last_crawled_at',
      header: 'Last crawled',
      render: (row) => (row.last_crawled_at ? new Date(row.last_crawled_at).toLocaleString() : 'Never'),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={Radar}
          loading={crawlingIds.includes(row.id)}
          disabled={row.status === 'crawling'}
          onClick={() => handleCrawl(row)}
        >
          {row.status === 'crawling' ? 'Crawling…' : 'Crawl now'}
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="All Sites">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate max-w-lg">
          Every website tracked in this workspace. No limit on how many you add — select one from the switcher at the top to work on it in any module.
        </p>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>
          Add Site
        </Button>
      </div>

      <Card padding="p-0">
        {sitesLoading ? (
          <div className="py-16 text-center text-sm text-slate">Loading sites…</div>
        ) : sites.length === 0 ? (
          <EmptyState
            icon={Globe}
            message="No sites yet"
            hint='Click "Add Site" to start tracking a domain — crawling, keywords, backlinks, and every other module will scope to it.'
          />
        ) : (
          <div className="p-5">
            <Table columns={columns} rows={sites} />
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add a site">
        <form onSubmit={handleAddSite} className="space-y-4">
          <Input
            label="Domain"
            required
            placeholder="example.com"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
          />
          <Input
            label="Display name (optional)"
            placeholder="My Company Site"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
          <Button type="submit" loading={saving} className="w-full justify-center">
            Add site
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
