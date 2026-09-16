import { useEffect, useState, useCallback } from 'react';
import { Sparkles, Code2, FileDown, Bot } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Textarea, Select } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { aeoApi } from '../../api/aeo';
import client from '../../api/client';

export default function AeoPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('citations');

  const [prompt, setPrompt] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState(null);
  const [shareOfVoice, setShareOfVoice] = useState([]);

  const [schemaType, setSchemaType] = useState('faq');
  const [schemaInput, setSchemaInput] = useState('{\n  "faqs": [{ "question": "Is data recovery guaranteed?", "answer": "No, but our lab has a high success rate." }]\n}');
  const [schemaResult, setSchemaResult] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [answerText, setAnswerText] = useState('');
  const [answerResult, setAnswerResult] = useState(null);
  const [answerLoading, setAnswerLoading] = useState(false);

  const [crawlerAudit, setCrawlerAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadSov = useCallback(async () => {
    if (!siteId) return;
    try {
      const { data } = await aeoApi.shareOfVoice(workspaceId, siteId);
      setShareOfVoice(data.data.summary || []);
    } catch { /* ignore */ }
  }, [workspaceId, siteId]);

  useEffect(() => { loadSov(); }, [loadSov]);

  async function handleCheck(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setChecking(true);
    try {
      const { data } = await aeoApi.checkCitation(workspaceId, siteId, prompt.trim());
      setCheckResults(data.data.results);
      loadSov();
    } catch (err) {
      push(err.response?.data?.message || 'Citation check failed.', 'error');
    } finally {
      setChecking(false);
    }
  }

  async function handleSchema(e) {
    e.preventDefault();
    setSchemaLoading(true);
    try {
      const payload = JSON.parse(schemaInput);
      const { data } = await aeoApi.generateSchema(workspaceId, siteId, schemaType, payload);
      setSchemaResult(data.data);
    } catch (err) {
      push(err instanceof SyntaxError ? 'Invalid JSON input.' : err.response?.data?.message || 'Schema generation failed.', 'error');
    } finally {
      setSchemaLoading(false);
    }
  }

  async function handleAnswerScore(e) {
    e.preventDefault();
    setAnswerLoading(true);
    try {
      const { data } = await aeoApi.answerScore(workspaceId, siteId, { bodyText: answerText, headings: [] });
      setAnswerResult(data.data);
    } catch {
      push('Scoring failed.', 'error');
    } finally {
      setAnswerLoading(false);
    }
  }

  async function handleCrawlerAudit() {
    setAuditLoading(true);
    try {
      const { data } = await aeoApi.crawlerAudit(workspaceId, siteId);
      setCrawlerAudit(data.data.audit);
    } catch {
      push('Audit failed.', 'error');
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleLlmsTxt() {
    try {
      const res = await client.get(`/workspaces/${workspaceId}/sites/${siteId}/aeo/llms-txt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'llms.txt';
      a.click();
    } catch {
      push('Could not generate llms.txt.', 'error');
    }
  }

  return (
    <DashboardLayout title="AEO / GEO Lab">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          Answer Engine and Generative Engine Optimization for {currentSite?.domain} — AI citation tracking, structured data, and answer-format scoring.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'citations', label: 'Citation Tracker' },
                { key: 'schema', label: 'Schema Generator' },
                { key: 'answer', label: 'Answer Scorer' },
                { key: 'crawlers', label: 'AI Crawler Audit' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="p-5">
            {tab === 'citations' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <form onSubmit={handleCheck} className="space-y-3 mb-6">
                    <Textarea
                      label="Prompt to check"
                      required
                      rows={3}
                      placeholder="e.g. best hard drive data recovery service in Delhi"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Button type="submit" loading={checking} icon={Sparkles} className="w-full justify-center">
                      Check citation
                    </Button>
                  </form>

                  {checkResults && (
                    <div className="space-y-2">
                      {checkResults.map((r) => (
                        <div key={r.engine} className="flex items-center justify-between p-3 rounded-lg bg-slate/5 text-sm">
                          <span className="font-mono uppercase text-xs text-navy">{r.engine.replace('_', ' ')}</span>
                          {r.error ? (
                            <span className="text-xs text-slate">{r.error}</span>
                          ) : (
                            <Badge tone={r.wasCited ? 'success' : 'neutral'}>{r.wasCited ? 'Cited' : 'Not cited'}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-mono uppercase text-slate mb-3">Share of voice, all-time</div>
                  {shareOfVoice.length === 0 ? (
                    <EmptyState message="No citation checks yet" hint="Run a prompt check to start building visibility data." />
                  ) : (
                    <div className="space-y-2">
                      {shareOfVoice.map((s) => (
                        <div key={s.engine} className="flex items-center justify-between p-3 border border-slate/15 rounded-lg text-sm">
                          <span className="font-medium text-navy capitalize">{s.engine.replace('_', ' ')}</span>
                          <span className="font-mono text-teal-deep">{s.citationRate}% ({s.citedCount}/{s.totalChecks})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'schema' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleSchema} className="space-y-3">
                  <Select label="Schema type" value={schemaType} onChange={(e) => setSchemaType(e.target.value)}>
                    <option value="faq">FAQ</option>
                    <option value="howto">HowTo</option>
                    <option value="article">Article</option>
                    <option value="product">Product</option>
                  </Select>
                  <Textarea label="Input data (JSON)" rows={10} value={schemaInput} onChange={(e) => setSchemaInput(e.target.value)} className="font-mono text-xs" />
                  <Button type="submit" loading={schemaLoading} icon={Code2} className="w-full justify-center">Generate schema</Button>
                </form>
                <div>
                  {schemaResult ? (
                    <pre className="text-xs font-mono bg-ink text-teal p-4 rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
                      {JSON.stringify(schemaResult.schema, null, 2)}
                    </pre>
                  ) : (
                    <EmptyState message="No schema generated yet" />
                  )}
                </div>
              </div>
            )}

            {tab === 'answer' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleAnswerScore} className="space-y-3">
                  <Textarea label="Content to score" required rows={8} value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Paste page content…" />
                  <Button type="submit" loading={answerLoading} className="w-full justify-center">Score extractability</Button>
                </form>
                <div>
                  {answerResult ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-mono font-bold text-navy mb-2">{answerResult.score}/100</div>
                      {answerResult.checks.map((c) => (
                        <div key={c.check} className={`text-xs p-2.5 rounded-lg ${c.passed ? 'bg-teal-soft' : 'bg-amber-50'}`}>
                          <div className="font-medium text-navy">{c.passed ? '✓' : '⚠'} {c.check}</div>
                          <div className="text-slate mt-0.5">{c.detail}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No score yet" />
                  )}
                </div>
              </div>
            )}

            {tab === 'crawlers' && (
              <div>
                <div className="flex gap-2 mb-5">
                  <Button variant="ghost" icon={Bot} loading={auditLoading} onClick={handleCrawlerAudit}>Run audit</Button>
                  <Button icon={FileDown} onClick={handleLlmsTxt}>Download llms.txt</Button>
                </div>
                {crawlerAudit ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {crawlerAudit.map((bot) => (
                      <div key={bot.name} className="flex items-center justify-between p-3 border border-slate/15 rounded-lg text-sm">
                        <div>
                          <div className="font-medium text-navy">{bot.name}</div>
                          <div className="text-xs text-slate">{bot.owner}</div>
                        </div>
                        <Badge tone={bot.allowed ? 'success' : 'danger'}>{bot.allowed ? 'Allowed' : 'Blocked'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No audit run yet" hint="Checks robots.txt against GPTBot, ClaudeBot, PerplexityBot, and more." />
                )}
              </div>
            )}
          </div>
        </Card>
      </RequireSite>
    </DashboardLayout>
  );
}
