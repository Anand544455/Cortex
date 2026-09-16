import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, Search, Layers, Target } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Spinner, EmptyState } from '../../components/ui/DataDisplay';
import { Tabs, Modal } from '../../components/ui/Overlay';
import { Input } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { keywordApi } from '../../api/keywords';

export default function KeywordsPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('tracked');
  const [keywords, setKeywords] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const [seed, setSeed] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [expanding, setExpanding] = useState(false);

  const [gapDomains, setGapDomains] = useState('');
  const [gapResult, setGapResult] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const [k, c] = await Promise.allSettled([
      keywordApi.list(workspaceId, siteId),
      keywordApi.clusters(workspaceId, siteId),
    ]);
    if (k.status === 'fulfilled') setKeywords(k.value.data.data.keywords || []);
    if (c.status === 'fulfilled') setClusters(c.value.data.data.clusters || []);
    setLoading(false);
  }, [workspaceId, siteId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddKeyword(e) {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setSaving(true);
    try {
      await keywordApi.add(workspaceId, siteId, [{ keyword: newKeyword.trim() }]);
      push(`"${newKeyword}" is now tracked.`);
      setNewKeyword('');
      setModalOpen(false);
      load();
    } catch (err) {
      push(err.response?.data?.message || 'Could not add keyword.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    try {
      await keywordApi.remove(workspaceId, siteId, id);
      push('Keyword removed.');
      load();
    } catch {
      push('Could not remove keyword.', 'error');
    }
  }

  async function handleCheckAll() {
    setChecking(true);
    try {
      const { data } = await keywordApi.runCheck(workspaceId, siteId);
      push(`Rank check queued for ${data.data.keywordCount} keyword(s).`);
    } catch (err) {
      push(err.response?.data?.message || 'Could not queue rank check.', 'error');
    } finally {
      setChecking(false);
    }
  }

  async function handleExpand(e) {
    e.preventDefault();
    if (!seed.trim()) return;
    setExpanding(true);
    try {
      const { data } = await keywordApi.expand(workspaceId, siteId, seed.trim());
      setSuggestions(data.data.suggestions || []);
    } catch {
      push('Could not expand keyword.', 'error');
    } finally {
      setExpanding(false);
    }
  }

  async function handleGap(e) {
    e.preventDefault();
    const domains = gapDomains.split(',').map((d) => d.trim()).filter(Boolean);
    if (domains.length === 0) return;
    setGapLoading(true);
    try {
      const { data } = await keywordApi.gap(workspaceId, siteId, { competitorDomains: domains });
      setGapResult(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Gap analysis failed.', 'error');
    } finally {
      setGapLoading(false);
    }
  }

  const keywordColumns = [
    { key: 'keyword', header: 'Keyword' },
    { key: 'device', header: 'Device', render: (r) => <Badge tone="neutral">{r.device}</Badge> },
    { key: 'location', header: 'Location' },
    { key: 'search_engine', header: 'Engine' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button onClick={() => handleRemove(r.id)} className="text-slate hover:text-red-500">
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Keyword Intelligence">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate max-w-lg">
            Research, cluster, and track rankings for {currentSite?.domain}.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" icon={RefreshCw} loading={checking} onClick={handleCheckAll}>
              Check rankings now
            </Button>
            <Button icon={Plus} onClick={() => setModalOpen(true)}>Add keyword</Button>
          </div>
        </div>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'tracked', label: `Tracked (${keywords.length})` },
                { key: 'clusters', label: 'Clusters' },
                { key: 'expand', label: 'Seed Expansion' },
                { key: 'gap', label: 'Competitor Gap' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner size={24} /></div>
            ) : (
              <>
                {tab === 'tracked' && <Table columns={keywordColumns} rows={keywords} emptyMessage="No keywords tracked yet." />}

                {tab === 'clusters' && (
                  clusters.length === 0 ? (
                    <EmptyState icon={Layers} message="No clusters yet" hint="Add a few keywords first — clustering groups them by shared topic." />
                  ) : (
                    <div className="space-y-3">
                      {clusters.map((c, i) => (
                        <div key={i} className="border border-slate/15 rounded-lg p-3.5">
                          <div className="text-sm font-medium text-navy mb-1.5">{c.label}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.keywords.map((k) => (
                              <Badge key={k} tone="teal">{k}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {tab === 'expand' && (
                  <div>
                    <form onSubmit={handleExpand} className="flex gap-2 mb-4 max-w-md">
                      <Input placeholder="Seed keyword, e.g. data recovery" value={seed} onChange={(e) => setSeed(e.target.value)} />
                      <Button type="submit" loading={expanding} icon={Search}>Expand</Button>
                    </form>
                    {suggestions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                          <Badge key={s} tone="navy">{s}</Badge>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="No suggestions yet" hint="Type a seed keyword and click Expand — pulls from Google Autocomplete." />
                    )}
                  </div>
                )}

                {tab === 'gap' && (
                  <div>
                    <form onSubmit={handleGap} className="flex gap-2 mb-4 max-w-lg">
                      <Input
                        placeholder="competitor1.com, competitor2.com"
                        value={gapDomains}
                        onChange={(e) => setGapDomains(e.target.value)}
                      />
                      <Button type="submit" loading={gapLoading} icon={Target}>Analyze</Button>
                    </form>
                    {gapResult ? (
                      <div>
                        <p className="text-sm text-slate mb-3">
                          {gapResult.gapCount} of {gapResult.totalKeywords} keywords show a gap.
                        </p>
                        <div className="space-y-2">
                          {gapResult.rows.map((r) => (
                            <div key={r.keyword} className={`flex items-center justify-between p-3 rounded-lg text-sm ${r.isGap ? 'bg-amber-50' : 'bg-slate/5'}`}>
                              <span className="font-medium text-navy">{r.keyword}</span>
                              <span className="text-xs text-slate font-mono">
                                You: {r.sitePosition ?? '—'} · {Object.entries(r.competitorPositions).map(([d, p]) => `${d}: ${p ?? '—'}`).join(' · ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <EmptyState message="No analysis yet" hint="Enter competitor domains (comma-separated) to compare against your tracked keywords." />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Track a keyword">
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <Input
              label="Keyword"
              required
              placeholder="hard drive data recovery"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
            />
            <Button type="submit" loading={saving} className="w-full justify-center">Track keyword</Button>
          </form>
        </Modal>
      </RequireSite>
    </DashboardLayout>
  );
}
