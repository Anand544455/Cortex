import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Radar, Search, Link2, Sparkles } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { ScoreRing, StatCard, Spinner } from '../components/ui/DataDisplay';
import RequireSite from '../components/ui/RequireSite';
import { useWorkspace } from '../context/WorkspaceContext';
import { crawlApi } from '../api/crawl';
import { keywordApi } from '../api/keywords';
import { backlinkApi } from '../api/backlinks';
import { aeoApi } from '../api/aeo';

export default function Dashboard() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const [audit, setAudit] = useState(null);
  const [backlinks, setBacklinks] = useState(null);
  const [citations, setCitations] = useState([]);
  const [rankHistory, setRankHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    Promise.allSettled([
      crawlApi.getAudit(workspaceId, siteId),
      backlinkApi.summary(workspaceId, siteId),
      aeoApi.shareOfVoice(workspaceId, siteId),
      keywordApi.rankHistory(workspaceId, siteId, { days: 30 }),
    ]).then(([a, b, c, r]) => {
      if (a.status === 'fulfilled') setAudit(a.value.data.data);
      if (b.status === 'fulfilled') setBacklinks(b.value.data.data);
      if (c.status === 'fulfilled') setCitations(c.value.data.data.summary || []);
      if (r.status === 'fulfilled') setRankHistory(r.value.data.data.history || []);
      setLoading(false);
    });
  }, [workspaceId, siteId]);

  const chartData = rankHistory
    .slice()
    .reverse()
    .reduce((acc, row) => {
      const date = new Date(row.checked_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const existing = acc.find((d) => d.date === date);
      if (existing) {
        existing.total += row.position || 0;
        existing.count += 1;
        existing.avgPosition = Math.round(existing.total / existing.count);
      } else {
        acc.push({ date, total: row.position || 0, count: 1, avgPosition: row.position || 0 });
      }
      return acc;
    }, []);

  return (
    <DashboardLayout title="Command Center">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-semibold text-navy text-lg">
                {currentSite?.display_name || currentSite?.domain}
              </h2>
              <p className="text-sm text-slate">{currentSite?.domain} — everything CORTEX knows, in one view.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Pages crawled" value={audit?.totalPages ?? '—'} sub="Crawl & Technical" />
              <StatCard
                label="Referring domains"
                value={backlinks?.referringDomains ?? '—'}
                sub={backlinks ? `${backlinks.totalToxicLinks} flagged toxic` : 'Backlink Engine'}
                deltaTone={backlinks?.totalToxicLinks > 0 ? 'danger' : 'success'}
              />
              <StatCard
                label="Keywords tracked"
                value={new Set(rankHistory.map((r) => r.keyword)).size || '—'}
                sub="Keyword Intelligence"
              />
              <StatCard
                label="AI citation checks"
                value={citations.reduce((sum, c) => sum + c.totalChecks, 0) || '—'}
                sub="AEO / GEO Lab"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card title="Site Health" className="lg:col-span-1">
                <div className="flex flex-col items-center py-4">
                  <ScoreRing score={audit?.healthScore ?? 0} size={104} />
                  <p className="text-xs text-slate mt-3 text-center">
                    {audit?.totalPages
                      ? `Based on ${audit.totalPages} crawled pages.`
                      : 'Run a crawl to see your health score.'}
                  </p>
                </div>
              </Card>

              <Card title="Average Rank Position (30 days)" className="lg:col-span-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEE" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6B7C' }} />
                      <YAxis reversed tick={{ fontSize: 11, fill: '#5B6B7C' }} width={28} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgPosition" stroke="#0F9C8F" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-slate">
                    No rank history yet — track keywords to see trends here.
                  </div>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <QuickLink icon={Radar} to="/crawl" label="Run a crawl" desc="Check technical health" />
              <QuickLink icon={Search} to="/keywords" label="Track a keyword" desc="Start rank monitoring" />
              <QuickLink icon={Link2} to="/backlinks" label="Import backlinks" desc="Upload a CSV export" />
              <QuickLink icon={Sparkles} to="/aeo" label="Check AI citations" desc="ChatGPT / Claude visibility" />
            </div>
          </div>
        )}
      </RequireSite>
    </DashboardLayout>
  );
}

function QuickLink({ icon: Icon, to, label, desc }) {
  return (
    <a
      href={to}
      className="bg-white border border-slate/15 rounded-card shadow-card p-4 flex items-start gap-3 hover:border-teal-deep hover:shadow-lift transition"
    >
      <div className="w-9 h-9 rounded-lg bg-teal-soft flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-teal-deep" />
      </div>
      <div>
        <div className="text-sm font-medium text-navy">{label}</div>
        <div className="text-xs text-slate">{desc}</div>
      </div>
    </a>
  );
}
