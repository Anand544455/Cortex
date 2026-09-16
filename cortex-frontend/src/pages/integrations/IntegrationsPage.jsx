import { useEffect, useState, useCallback } from 'react';
import { Search, BarChart3, Tag, Gauge, Zap, Globe2, CheckCircle2, Unlink } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { EmptyState, Spinner } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Input, Select } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { integrationsApi } from '../../api/integrations';

const GOOGLE_PROVIDERS = [
  { key: 'google_search_console', label: 'Search Console', icon: Search, desc: 'Real clicks, impressions, and position — free, official.' },
  { key: 'google_analytics', label: 'Analytics 4', icon: BarChart3, desc: 'Real traffic and conversion data.' },
  { key: 'google_tag_manager', label: 'Tag Manager', icon: Tag, desc: 'Manage tags, automate GA4 setup.' },
];

export default function IntegrationsPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [psUrl, setPsUrl] = useState('');
  const [psStrategy, setPsStrategy] = useState('mobile');
  const [psResult, setPsResult] = useState(null);
  const [psLoading, setPsLoading] = useState(false);

  const [indexNowKey, setIndexNowKey] = useState(null);
  const [indexNowLoading, setIndexNowLoading] = useState(false);

  const [bingRows, setBingRows] = useState(null);
  const [bingLoading, setBingLoading] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const { data } = await integrationsApi.list(workspaceId, siteId);
      setConnections(data.data.connections || []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, siteId]);

  useEffect(() => { load(); }, [load]);

  function isConnected(provider) {
    return connections.some((c) => c.provider === provider && c.is_active);
  }

  function handleConnect(provider) {
    window.location.href = integrationsApi.connectGoogleUrl(workspaceId, siteId, provider);
  }

  async function handleDisconnect(provider) {
    try {
      await integrationsApi.disconnect(workspaceId, siteId, provider);
      push('Disconnected.');
      load();
    } catch {
      push('Could not disconnect.', 'error');
    }
  }

  async function handlePagespeed(e) {
    e.preventDefault();
    if (!psUrl.trim()) return;
    setPsLoading(true);
    try {
      const { data } = await integrationsApi.pagespeed(workspaceId, siteId, psUrl.trim(), psStrategy);
      setPsResult(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'PageSpeed check failed — is PAGESPEED_API_KEY configured on the backend?', 'error');
    } finally {
      setPsLoading(false);
    }
  }

  async function handleGenerateIndexNowKey() {
    setIndexNowLoading(true);
    try {
      const { data } = await integrationsApi.indexNowGenerateKey(workspaceId, siteId);
      setIndexNowKey(data.data.key);
    } catch {
      push('Could not generate key.', 'error');
    } finally {
      setIndexNowLoading(false);
    }
  }

  async function handleIndexNowSubmit() {
    setIndexNowLoading(true);
    try {
      const { data } = await integrationsApi.indexNowSubmit(workspaceId, siteId);
      push(`Submitted ${data.data.submitted} URL(s) to IndexNow.`);
    } catch (err) {
      push(err.response?.data?.message || 'Submit failed — set INDEXNOW_KEY on the backend first.', 'error');
    } finally {
      setIndexNowLoading(false);
    }
  }

  async function handleBingCheck() {
    setBingLoading(true);
    try {
      const { data } = await integrationsApi.bingPerformance(workspaceId, siteId);
      setBingRows(data.data.rows || []);
    } catch (err) {
      push(err.response?.data?.message || 'Bing check failed — is BING_WEBMASTER_API_KEY configured?', 'error');
    } finally {
      setBingLoading(false);
    }
  }

  return (
    <DashboardLayout title="Integrations">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          Connect free, official data sources for {currentSite?.domain} — no paid third-party API anywhere on this page.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'connections', label: 'Google Connections' },
                { key: 'pagespeed', label: 'PageSpeed Insights' },
                { key: 'indexnow', label: 'IndexNow' },
                { key: 'bing', label: 'Bing Webmaster' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="p-5">
            {tab === 'connections' && (
              loading ? <div className="flex justify-center py-16"><Spinner size={24} /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {GOOGLE_PROVIDERS.map((p) => {
                    const connected = isConnected(p.key);
                    const connection = connections.find((c) => c.provider === p.key);
                    return (
                      <div key={p.key} className="border border-slate/15 rounded-lg p-4">
                        <div className="w-9 h-9 rounded-lg bg-teal-soft flex items-center justify-center mb-3">
                          <p.icon size={16} className="text-teal-deep" />
                        </div>
                        <div className="font-medium text-navy text-sm mb-1">{p.label}</div>
                        <p className="text-xs text-slate mb-3">{p.desc}</p>
                        {connected ? (
                          <>
                            <Badge tone="success" className="mb-2"><CheckCircle2 size={11} /> Connected {connection?.connected_account_email && `(${connection.connected_account_email})`}</Badge>
                            <Button size="sm" variant="danger" icon={Unlink} onClick={() => handleDisconnect(p.key)} className="w-full justify-center mt-1">
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => handleConnect(p.key)} className="w-full justify-center">Connect</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {tab === 'pagespeed' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handlePagespeed} className="space-y-3">
                  <Input label="Page URL" required value={psUrl} onChange={(e) => setPsUrl(e.target.value)} placeholder="https://example.com/page" />
                  <Select label="Strategy" value={psStrategy} onChange={(e) => setPsStrategy(e.target.value)}>
                    <option value="mobile">Mobile</option>
                    <option value="desktop">Desktop</option>
                  </Select>
                  <Button type="submit" loading={psLoading} icon={Gauge} className="w-full justify-center">Analyze</Button>
                </form>
                <div>
                  {psResult ? (
                    <div>
                      <div className="text-2xl font-mono font-bold text-navy mb-3">{psResult.performanceScore}/100</div>
                      <div className="text-xs font-mono uppercase text-slate mb-1.5">Real field data (Chrome UX Report)</div>
                      {psResult.field.hasFieldData ? (
                        <div className="space-y-1 mb-4">
                          <div className="text-sm">LCP: <span className="font-mono">{psResult.field.lcp}ms</span></div>
                          <div className="text-sm">CLS: <span className="font-mono">{psResult.field.cls}</span></div>
                          <div className="text-sm">INP: <span className="font-mono">{psResult.field.inp ?? 'not enough data'}ms</span></div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate mb-4">Not enough real-user traffic yet for field data on this exact page.</p>
                      )}
                      <div className="text-xs font-mono uppercase text-slate mb-1.5">Lab data (this test run)</div>
                      <div className="space-y-1">
                        <div className="text-sm">LCP: <span className="font-mono">{Math.round(psResult.lab.lcp)}ms</span></div>
                        <div className="text-sm">CLS: <span className="font-mono">{psResult.lab.cls?.toFixed(3)}</span></div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No analysis yet" hint="Requires PAGESPEED_API_KEY set on the backend (free, no billing account needed)." />
                  )}
                </div>
              </div>
            )}

            {tab === 'indexnow' && (
              <div className="max-w-md space-y-4">
                <p className="text-sm text-slate">
                  IndexNow is an open protocol (not a Google product) adopted by Bing, Yandex, and Seznam for instant indexing pings.
                </p>
                <Button variant="ghost" icon={Zap} loading={indexNowLoading} onClick={handleGenerateIndexNowKey}>Generate a key</Button>
                {indexNowKey && (
                  <div className="text-xs font-mono bg-teal-soft text-teal-deep p-3 rounded-lg break-all">
                    {indexNowKey}
                    <p className="text-slate mt-2 normal-case font-sans">
                      Save this to <code>INDEXNOW_KEY</code> in the backend's .env, then host it at
                      <br />https://{currentSite?.domain}/{indexNowKey}.txt (plain text, just the key) before submitting.
                    </p>
                  </div>
                )}
                <Button icon={Zap} loading={indexNowLoading} onClick={handleIndexNowSubmit}>Submit all crawled pages now</Button>
              </div>
            )}

            {tab === 'bing' && (
              <div>
                <Button icon={Globe2} loading={bingLoading} onClick={handleBingCheck} className="mb-4">Check Bing performance</Button>
                {bingRows === null ? (
                  <EmptyState message="No data yet" hint="Requires BING_WEBMASTER_API_KEY set on the backend (free, from Bing Webmaster Tools > Settings > API Access)." />
                ) : bingRows.length === 0 ? (
                  <EmptyState message="No data returned for this site yet." />
                ) : (
                  <div className="space-y-1.5">
                    {bingRows.slice(0, 20).map((r, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 border-b border-slate/10">
                        <span className="text-slate">{r.date}</span>
                        <span className="font-mono text-navy">{r.clicks} clicks · {r.impressions} impressions</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </RequireSite>
    </DashboardLayout>
  );
}
