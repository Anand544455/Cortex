import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, RefreshCw, ShieldAlert, Download, Link2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Spinner, StatCard, EmptyState } from '../../components/ui/DataDisplay';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { backlinkApi } from '../../api/backlinks';
import client from '../../api/client';

export default function BacklinksPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const fileRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const params = filter === 'toxic' ? { toxic: true } : filter === 'lost' ? { status: 'lost' } : {};
    const [s, l] = await Promise.allSettled([
      backlinkApi.summary(workspaceId, siteId),
      backlinkApi.list(workspaceId, siteId, params),
    ]);
    if (s.status === 'fulfilled') setSummary(s.value.data.data);
    if (l.status === 'fulfilled') setLinks(l.value.data.data.links || []);
    setLoading(false);
  }, [workspaceId, siteId, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { data } = await backlinkApi.importCsv(workspaceId, siteId, file);
      push(`Imported: ${data.data.newCount} new, ${data.data.updatedCount} updated.`);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Import failed — check the CSV format.', 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { data } = await backlinkApi.sync(workspaceId, siteId);
      push(`Sync complete: ${data.data.newCount} new, ${data.data.lostCount} lost.`);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Sync needs a backlink API key configured — try CSV import instead.', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleRescan() {
    setRescanning(true);
    try {
      const { data } = await backlinkApi.rescanToxic(workspaceId, siteId);
      push(`Rescanned ${data.data.updatedCount} links, ${data.data.toxicCount} flagged toxic.`);
      load();
    } catch {
      push('Rescan failed.', 'error');
    } finally {
      setRescanning(false);
    }
  }

  async function handleDisavow() {
    try {
      const res = await client.get(`/workspaces/${workspaceId}/sites/${siteId}/backlinks/disavow`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'disavow.txt';
      a.click();
    } catch {
      push('No toxic links found to disavow.', 'info');
    }
  }

  const columns = [
    { key: 'source_domain', header: 'Source domain', render: (r) => <span className="font-mono text-xs">{r.source_domain}</span> },
    { key: 'anchor_text', header: 'Anchor text' },
    { key: 'link_type', header: 'Type', render: (r) => <Badge tone="neutral">{r.link_type}</Badge> },
    { key: 'domain_score', header: 'Score' },
    {
      key: 'is_toxic',
      header: 'Toxic?',
      render: (r) => (r.is_toxic ? <Badge tone="danger">Toxic</Badge> : <Badge tone="success">Clean</Badge>),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge> },
  ];

  return (
    <DashboardLayout title="Backlink Engine">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-sm text-slate max-w-md">
            Backlink index for {currentSite?.domain} — import from Ahrefs/SEMrush/Moz, or sync from a licensed API.
          </p>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Button variant="ghost" icon={Upload} loading={importing} onClick={() => fileRef.current?.click()}>
              Import CSV
            </Button>
            <Button variant="ghost" icon={RefreshCw} loading={syncing} onClick={handleSync}>Sync from API</Button>
            <Button variant="ghost" icon={ShieldAlert} loading={rescanning} onClick={handleRescan}>Rescan toxic</Button>
            <Button icon={Download} onClick={handleDisavow}>Download disavow.txt</Button>
          </div>
        </div>

        {loading && !summary ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Referring domains" value={summary?.referringDomains ?? 0} />
              <StatCard label="Active links" value={summary?.totalActiveLinks ?? 0} />
              <StatCard label="Toxic links" value={summary?.totalToxicLinks ?? 0} deltaTone="danger" />
              <StatCard label="Lost links" value={summary?.totalLostLinks ?? 0} deltaTone="danger" />
            </div>

            <Card padding="p-0">
              <div className="px-5 pt-5 flex items-center gap-2">
                {['all', 'toxic', 'lost'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide transition ${
                      filter === f ? 'bg-teal-deep text-white' : 'bg-slate/10 text-slate hover:bg-slate/20'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {links.length === 0 ? (
                  <EmptyState icon={Link2} message="No backlinks yet" hint='Click "Import CSV" to upload an Ahrefs, SEMrush, or Moz export.' />
                ) : (
                  <Table columns={columns} rows={links} keyField="_id" />
                )}
              </div>
            </Card>
          </div>
        )}
      </RequireSite>
    </DashboardLayout>
  );
}
