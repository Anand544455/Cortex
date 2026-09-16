import { useState } from 'react';
import { Brain, PlayCircle, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ScoreRing, EmptyState } from '../../components/ui/DataDisplay';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { agentApi } from '../../api/agent';

const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' };

export default function AgentPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleRunAudit() {
    setLoading(true);
    try {
      const { data } = await agentApi.runAudit(workspaceId, siteId);
      setResult(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Audit failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Agent">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-start gap-3 max-w-lg">
            <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
              <Brain size={18} className="text-teal" />
            </div>
            <p className="text-sm text-slate">
              Runs every self-hosted analysis module for {currentSite?.domain} in one pass and returns a prioritized action plan — zero cost, zero third-party dependency.
            </p>
          </div>
          <Button icon={PlayCircle} loading={loading} onClick={handleRunAudit}>Run full audit</Button>
        </div>

        {!result ? (
          <Card>
            <EmptyState
              icon={Brain}
              message="No audit run yet"
              hint='Click "Run full audit" — it checks crawl health, content issues, backlinks, and AI-crawler access all at once.'
            />
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <div className="flex items-center gap-5 flex-wrap">
                <ScoreRing score={result.healthScore} size={96} />
                <div className="flex-1 min-w-[240px]">
                  <p className="text-sm text-navy leading-relaxed">{result.narrativeSummary}</p>
                  <p className="text-xs text-slate mt-2 font-mono">Generated {new Date(result.generatedAt).toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card title={`Prioritized Action Plan (${result.totalFindings})`} padding="p-0">
              {result.plan.length === 0 ? (
                <EmptyState message="No issues found — this site is in great shape." />
              ) : (
                <div className="divide-y divide-slate/10">
                  {result.plan.map((item) => (
                    <div key={item.priority} className="p-5 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate/10 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-navy">
                        {item.priority}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge tone={SEVERITY_TONE[item.severity]}>{item.severity}</Badge>
                          <Badge tone="neutral">{item.category}</Badge>
                          <span className="font-medium text-navy text-sm">{item.title}</span>
                        </div>
                        <p className="text-sm text-slate mb-2">{item.whatWeFound}</p>
                        <p className="text-xs text-teal-deep bg-teal-soft inline-block px-2.5 py-1.5 rounded-lg">
                          → {item.whatToDoNextSteps}
                        </p>
                        {item.affectedSample?.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {item.affectedSample.slice(0, 5).map((a, i) => (
                              <div key={i} className="text-xs font-mono text-slate truncate">{a}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex items-start gap-2 text-xs text-slate">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Every finding here comes from data already collected on this platform, or from free integrations you've connected — nothing is estimated by a paid AI model unless you've configured a local Ollama model.</span>
            </div>
          </div>
        )}
      </RequireSite>
    </DashboardLayout>
  );
}
