import { useEffect, useState, useCallback } from 'react';
import { Radar, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, ScoreRing, Spinner, EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { crawlApi } from '../../api/crawl';

export default function CrawlPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('audit');
  const [audit, setAudit] = useState(null);
  const [pages, setPages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const [a, p, l] = await Promise.allSettled([
      crawlApi.getAudit(workspaceId, siteId),
      crawlApi.getPages(workspaceId, siteId, 1, 50),
      crawlApi.getCrawlLogs(workspaceId, siteId, 10),
    ]);
    if (a.status === 'fulfilled') setAudit(a.value.data.data);
    if (p.status === 'fulfilled') setPages(p.value.data.data.pages || []);
    if (l.status === 'fulfilled') setLogs(l.value.data.data.logs || []);
    setLoading(false);
  }, [workspaceId, siteId]);

  useEffect(() => { load(); }, [load]);

  async function handleCrawl() {
    setCrawling(true);
    try {
      await crawlApi.triggerCrawl(workspaceId, siteId);
      push('Crawl queued. This can take a few minutes — refresh to check progress.');
    } catch (err) {
      push(err.response?.data?.message || 'Could not queue crawl.', 'error');
    } finally {
      setCrawling(false);
    }
  }

  const pageColumns = [
    { key: 'url', header: 'URL', render: (r) => <span className="font-mono text-xs break-all">{r.url}</span> },
    {
      key: 'status_code',
      header: 'Status',
      render: (r) => (
        <Badge tone={r.status_code >= 400 || !r.status_code ? 'danger' : 'success'}>{r.status_code || 'error'}</Badge>
      ),
    },
    { key: 'title', header: 'Title', render: (r) => r.title || <span className="text-red-500 text-xs">Missing</span> },
    { key: 'word_count', header: 'Words' },
  ];

  const logColumns = [
    { key: 'job_type', header: 'Job' },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { key: 'pages_processed', header: 'Pages' },
    { key: 'errors_count', header: 'Errors' },
    { key: 'createdAt', header: 'Started', render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <DashboardLayout title="Crawl & Technical SEO">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate max-w-lg">
            In-house Puppeteer crawler for {currentSite?.domain} — technical audit, Core Web Vitals, and page-level SEO data.
          </p>
          <Button icon={Radar} loading={crawling} onClick={handleCrawl}>Crawl now</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card title="Health Score">
                <div className="flex items-center gap-4">
                  <ScoreRing score={audit?.healthScore ?? 0} />
                  <div className="text-sm text-slate">{audit?.totalPages ?? 0} pages crawled</div>
                </div>
              </Card>
              <Card title="Top Issues" className="md:col-span-2">
                {audit?.issues && Object.keys(audit.issues).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(audit.issues).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-sm border-b border-slate/10 pb-2">
                        <span className="text-slate capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge tone={count > 0 ? 'warning' : 'success'}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={AlertTriangle} message="No crawl data yet" hint='Click "Crawl now" to get started.' />
                )}
              </Card>
            </div>

            <Card padding="p-0">
              <div className="px-5 pt-5">
                <Tabs
                  tabs={[
                    { key: 'audit', label: `Pages (${pages.length})` },
                    { key: 'logs', label: 'Crawl History' },
                  ]}
                  active={tab}
                  onChange={setTab}
                />
              </div>
              <div className="p-5">
                {tab === 'audit' && (
                  <Table columns={pageColumns} rows={pages} emptyMessage="No pages crawled yet." />
                )}
                {tab === 'logs' && (
                  <Table columns={logColumns} rows={logs} emptyMessage="No crawl jobs run yet." />
                )}
              </div>
            </Card>
          </div>
        )}
      </RequireSite>
    </DashboardLayout>
  );
}
