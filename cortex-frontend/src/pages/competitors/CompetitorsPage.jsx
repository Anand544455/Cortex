import { useState } from 'react';
import { Users, TrendingUp, Bell, Calculator } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Input } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { competitorApi } from '../../api/reporting';

export default function CompetitorsPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('sov');

  const [domains, setDomains] = useState('');
  const [sov, setSov] = useState(null);
  const [sovLoading, setSovLoading] = useState(false);

  const [cadenceDomain, setCadenceDomain] = useState('');
  const [cadence, setCadence] = useState(null);
  const [cadenceLoading, setCadenceLoading] = useState(false);

  const [alertDomains, setAlertDomains] = useState('');
  const [alerts, setAlerts] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [trafficPosition, setTrafficPosition] = useState('3');
  const [trafficVolume, setTrafficVolume] = useState('1000');
  const [trafficResult, setTrafficResult] = useState(null);

  async function handleSov(e) {
    e.preventDefault();
    const list = domains.split(',').map((d) => d.trim()).filter(Boolean);
    if (list.length === 0) return;
    setSovLoading(true);
    try {
      const { data } = await competitorApi.shareOfVoice(workspaceId, siteId, { competitorDomains: list });
      setSov(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Analysis failed.', 'error');
    } finally {
      setSovLoading(false);
    }
  }

  async function handleCadence(e) {
    e.preventDefault();
    if (!cadenceDomain.trim()) return;
    setCadenceLoading(true);
    try {
      const { data } = await competitorApi.contentCadence(workspaceId, siteId, cadenceDomain.trim());
      setCadence(data.data);
    } catch {
      push('Cadence analysis failed.', 'error');
    } finally {
      setCadenceLoading(false);
    }
  }

  async function handleAlerts(e) {
    e.preventDefault();
    const list = alertDomains.split(',').map((d) => d.trim()).filter(Boolean);
    if (list.length === 0) return;
    setAlertsLoading(true);
    try {
      const { data } = await competitorApi.alerts(workspaceId, siteId, { competitorDomains: list });
      setAlerts(data.data.alerts);
    } catch {
      push('Alert scan failed.', 'error');
    } finally {
      setAlertsLoading(false);
    }
  }

  async function handleTraffic(e) {
    e.preventDefault();
    const { data } = await competitorApi.trafficEstimate(workspaceId, siteId, {
      keywordData: [{ keyword: 'sample', position: Number(trafficPosition), monthlySearchVolume: Number(trafficVolume) }],
    });
    setTrafficResult(data.data);
  }

  return (
    <DashboardLayout title="Competitor Intelligence">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          Mirrors your own tracked data against named competitors for {currentSite?.domain} — no separate tracking setup needed.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'sov', label: 'Share of Voice' },
                { key: 'cadence', label: 'Content Cadence' },
                { key: 'alerts', label: 'Rival Alerts' },
                { key: 'traffic', label: 'Traffic Estimate' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
          <div className="p-5">
            {tab === 'sov' && (
              <div>
                <form onSubmit={handleSov} className="flex gap-2 mb-5 max-w-lg">
                  <Input placeholder="competitor1.com, competitor2.com" value={domains} onChange={(e) => setDomains(e.target.value)} />
                  <Button type="submit" loading={sovLoading} icon={Users}>Analyze</Button>
                </form>
                {sov ? (
                  <div className="space-y-2">
                    {sov.shareOfVoice.map((s) => (
                      <div key={s.domain} className={`flex items-center justify-between p-3 rounded-lg text-sm ${s.isSite ? 'bg-teal-soft' : 'bg-slate/5'}`}>
                        <span className={`font-medium ${s.isSite ? 'text-teal-deep' : 'text-navy'}`}>{s.domain} {s.isSite && '(you)'}</span>
                        <span className="font-mono text-slate">{s.sharePercent}% ({s.keywordsInTop10}/{sov.totalKeywordsAnalyzed})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No analysis yet" hint="Uses your existing SERP snapshot history from Keyword Intelligence." />
                )}
              </div>
            )}

            {tab === 'cadence' && (
              <div>
                <form onSubmit={handleCadence} className="flex gap-2 mb-5 max-w-md">
                  <Input placeholder="competitor.com" value={cadenceDomain} onChange={(e) => setCadenceDomain(e.target.value)} />
                  <Button type="submit" loading={cadenceLoading} icon={TrendingUp}>Analyze</Button>
                </form>
                {cadence ? (
                  cadence.note ? (
                    <EmptyState message={cadence.note} />
                  ) : (
                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                      <div><div className="text-2xl font-mono font-bold text-navy">{cadence.estimatedPostsPerMonth}</div><div className="text-xs text-slate">posts / month (est.)</div></div>
                      <div><div className="text-2xl font-mono font-bold text-navy">{cadence.averageDaysBetweenPosts}</div><div className="text-xs text-slate">avg. days between posts</div></div>
                    </div>
                  )
                ) : (
                  <EmptyState message="No analysis yet" hint="Reads the competitor's sitemap and JSON-LD publish dates." />
                )}
              </div>
            )}

            {tab === 'alerts' && (
              <div>
                <form onSubmit={handleAlerts} className="flex gap-2 mb-5 max-w-lg">
                  <Input placeholder="competitor1.com, competitor2.com" value={alertDomains} onChange={(e) => setAlertDomains(e.target.value)} />
                  <Button type="submit" loading={alertsLoading} icon={Bell}>Check for changes</Button>
                </form>
                {alerts ? (
                  alerts.length === 0 ? <EmptyState message="No ranking changes detected between your last two checks." /> : (
                    <div className="space-y-2">
                      {alerts.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-slate/15 rounded-lg text-sm">
                          <div>
                            <div className="text-navy font-medium">{a.keyword}</div>
                            <div className="text-xs text-slate font-mono">{a.domain}</div>
                          </div>
                          <Badge tone={a.change === 'improved' ? 'danger' : a.change === 'declined' ? 'success' : 'warning'}>{a.change}</Badge>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <EmptyState message="No scan run yet" hint="Compares the two most recent SERP snapshots per keyword." />
                )}
              </div>
            )}

            {tab === 'traffic' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleTraffic} className="space-y-3">
                  <Input label="Position (1-10)" type="number" min={1} max={10} value={trafficPosition} onChange={(e) => setTrafficPosition(e.target.value)} />
                  <Input label="Monthly search volume" type="number" value={trafficVolume} onChange={(e) => setTrafficVolume(e.target.value)} />
                  <Button type="submit" icon={Calculator} className="w-full justify-center">Estimate</Button>
                </form>
                <div>
                  {trafficResult ? (
                    <div>
                      <div className="text-2xl font-mono font-bold text-navy">{trafficResult.totalEstimatedMonthlyClicks}</div>
                      <div className="text-xs text-slate mb-2">estimated monthly clicks</div>
                      <p className="text-xs text-slate">
                        Range: {trafficResult.perKeyword[0]?.lowEstimate}–{trafficResult.perKeyword[0]?.highEstimate}. Based on a published industry-average CTR curve, not measured click data.
                      </p>
                    </div>
                  ) : (
                    <EmptyState message="No estimate yet" />
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </RequireSite>
    </DashboardLayout>
  );
}
