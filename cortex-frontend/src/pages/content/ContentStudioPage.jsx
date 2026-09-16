import { useState } from 'react';
import { FileSearch, Copy, GitCompareArrows, TrendingDown, Link as LinkIcon } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ScoreRing, EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Input, Textarea } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { contentApi } from '../../api/content';

export default function ContentStudioPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('score');

  const [scoreForm, setScoreForm] = useState({ title: '', metaDescription: '', h1: '', bodyText: '', targetKeyword: '' });
  const [scoreResult, setScoreResult] = useState(null);
  const [scoring, setScoring] = useState(false);

  const [briefKeyword, setBriefKeyword] = useState('');
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanType, setScanType] = useState(null);

  async function handleScore(e) {
    e.preventDefault();
    setScoring(true);
    try {
      const { data } = await contentApi.score(workspaceId, siteId, scoreForm);
      setScoreResult(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Scoring failed.', 'error');
    } finally {
      setScoring(false);
    }
  }

  async function handleBrief(e) {
    e.preventDefault();
    if (!briefKeyword.trim()) return;
    setBriefLoading(true);
    try {
      const { data } = await contentApi.brief(workspaceId, siteId, briefKeyword.trim());
      setBrief(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Could not generate brief.', 'error');
    } finally {
      setBriefLoading(false);
    }
  }

  async function runScan(type) {
    setScanType(type);
    setScanLoading(true);
    setScanResult(null);
    try {
      let data;
      if (type === 'duplicates') data = (await contentApi.duplicates(workspaceId, siteId)).data.data;
      if (type === 'cannibalization') data = (await contentApi.cannibalization(workspaceId, siteId)).data.data;
      if (type === 'decay') data = (await contentApi.decay(workspaceId, siteId, {})).data.data;
      if (type === 'internal-links') data = (await contentApi.internalLinks(workspaceId, siteId)).data.data;
      setScanResult(data);
    } catch {
      push('Scan failed.', 'error');
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <DashboardLayout title="Content Studio">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          On-page scoring, content briefs, and site-wide content health for {currentSite?.domain}.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'score', label: 'On-Page Score' },
                { key: 'brief', label: 'Content Brief' },
                { key: 'health', label: 'Site Content Health' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="p-5">
            {tab === 'score' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleScore} className="space-y-3">
                  <Input label="Target keyword" required value={scoreForm.targetKeyword} onChange={(e) => setScoreForm({ ...scoreForm, targetKeyword: e.target.value })} />
                  <Input label="Title tag" value={scoreForm.title} onChange={(e) => setScoreForm({ ...scoreForm, title: e.target.value })} />
                  <Input label="Meta description" value={scoreForm.metaDescription} onChange={(e) => setScoreForm({ ...scoreForm, metaDescription: e.target.value })} />
                  <Input label="H1" value={scoreForm.h1} onChange={(e) => setScoreForm({ ...scoreForm, h1: e.target.value })} />
                  <Textarea label="Body content" required rows={7} value={scoreForm.bodyText} onChange={(e) => setScoreForm({ ...scoreForm, bodyText: e.target.value })} placeholder="Paste your draft here…" />
                  <Button type="submit" loading={scoring} icon={FileSearch} className="w-full justify-center">Score content</Button>
                </form>

                <div>
                  {scoreResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <ScoreRing score={scoreResult.score} size={88} />
                        <div className="text-sm text-slate">
                          {scoreResult.wordCount} words · {scoreResult.keywordDensity}% density · Reading ease {scoreResult.readingEase}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {scoreResult.checks.map((c) => (
                          <div key={c.check} className={`text-xs p-2.5 rounded-lg ${c.passed ? 'bg-teal-soft' : 'bg-amber-50'}`}>
                            <div className="font-medium text-navy">{c.passed ? '✓' : '⚠'} {c.check}</div>
                            <div className="text-slate mt-0.5">{c.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No score yet" hint="Fill in the form and click Score content." />
                  )}
                </div>
              </div>
            )}

            {tab === 'brief' && (
              <div>
                <form onSubmit={handleBrief} className="flex gap-2 mb-5 max-w-md">
                  <Input placeholder="Target keyword" value={briefKeyword} onChange={(e) => setBriefKeyword(e.target.value)} />
                  <Button type="submit" loading={briefLoading}>Generate</Button>
                </form>
                {brief ? (
                  brief.competitorCount === 0 ? (
                    <EmptyState message={brief.note || 'No competitor data found.'} />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <div className="text-2xl font-mono font-bold text-navy">{brief.recommendedWordCount}</div>
                        <div className="text-xs text-slate mb-4">recommended word count (from {brief.competitorCount} competitor pages, avg {brief.competitorAverageWordCount})</div>
                        <div className="text-xs font-mono uppercase text-slate mb-2">Common subheadings</div>
                        <div className="flex flex-wrap gap-1.5">
                          {brief.commonHeadings.map((h, i) => <Badge key={i} tone="teal">{h.text} ({h.count})</Badge>)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-mono uppercase text-slate mb-2">Top-ranking pages analyzed</div>
                        <div className="space-y-2">
                          {brief.competitorOutlines.map((o, i) => (
                            <div key={i} className="text-xs border-b border-slate/10 pb-2">
                              <div className="text-navy font-medium truncate">{o.title || o.url}</div>
                              <div className="text-slate">{o.wordCount} words</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <EmptyState message="No brief yet" hint="Enter a keyword to analyze the current top-10 SERP." />
                )}
              </div>
            )}

            {tab === 'health' && (
              <div>
                <div className="flex gap-2 mb-5 flex-wrap">
                  <Button variant="ghost" size="sm" icon={Copy} loading={scanLoading && scanType === 'duplicates'} onClick={() => runScan('duplicates')}>Duplicate content</Button>
                  <Button variant="ghost" size="sm" icon={GitCompareArrows} loading={scanLoading && scanType === 'cannibalization'} onClick={() => runScan('cannibalization')}>Cannibalization</Button>
                  <Button variant="ghost" size="sm" icon={TrendingDown} loading={scanLoading && scanType === 'decay'} onClick={() => runScan('decay')}>Content decay</Button>
                  <Button variant="ghost" size="sm" icon={LinkIcon} loading={scanLoading && scanType === 'internal-links'} onClick={() => runScan('internal-links')}>Internal link gaps</Button>
                </div>

                {!scanResult ? (
                  <EmptyState message="Run a scan above" hint="Each scan reuses data already crawled/tracked — no extra setup needed." />
                ) : (
                  <ScanResultView type={scanType} data={scanResult} />
                )}
              </div>
            )}
          </div>
        </Card>
      </RequireSite>
    </DashboardLayout>
  );
}

function ScanResultView({ type, data }) {
  if (type === 'duplicates') {
    return data.duplicatePairs?.length ? (
      <div className="space-y-2">
        {data.duplicatePairs.map((p, i) => (
          <div key={i} className="text-xs p-3 bg-amber-50 rounded-lg">
            <div className="font-medium text-navy">{p.similarity} similar</div>
            <div className="text-slate font-mono truncate">{p.pageA}</div>
            <div className="text-slate font-mono truncate">{p.pageB}</div>
          </div>
        ))}
      </div>
    ) : <EmptyState message="No near-duplicate pages found." />;
  }
  if (type === 'cannibalization') {
    return data.findings?.length ? (
      <div className="space-y-2">
        {data.findings.map((f, i) => (
          <div key={i} className="text-xs p-3 bg-amber-50 rounded-lg">
            <div className="font-medium text-navy">{f.keyword}</div>
            {f.competingUrls.map((u, j) => <div key={j} className="text-slate font-mono">{u.url} — position {u.position}</div>)}
          </div>
        ))}
      </div>
    ) : <EmptyState message="No keyword cannibalization detected." />;
  }
  if (type === 'decay') {
    return data.findings?.length ? (
      <div className="space-y-2">
        {data.findings.map((f, i) => (
          <div key={i} className="text-xs p-3 bg-amber-50 rounded-lg flex justify-between">
            <span className="font-medium text-navy">{f.keyword}</span>
            <span className="text-slate font-mono">{f.priorAveragePosition} → {f.recentAveragePosition}</span>
          </div>
        ))}
      </div>
    ) : <EmptyState message="No declining keywords detected." />;
  }
  if (type === 'internal-links') {
    return data.suggestions?.length ? (
      <div className="space-y-2">
        {data.suggestions.map((s, i) => (
          <div key={i} className="text-xs p-3 bg-teal-soft rounded-lg">
            <div className="text-navy font-mono truncate">{s.pageA.title}</div>
            <div className="text-slate">↔ no link ↔</div>
            <div className="text-navy font-mono truncate">{s.pageB.title}</div>
          </div>
        ))}
      </div>
    ) : <EmptyState message="No internal-link gaps found." />;
  }
  return null;
}
