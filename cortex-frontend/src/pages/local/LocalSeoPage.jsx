import { useState } from 'react';
import { MapPin, ShieldCheck, MessageSquareHeart, Star } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Input, Textarea } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { localApi } from '../../api/local';

export default function LocalSeoPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('geogrid');

  const [gridForm, setGridForm] = useState({ keyword: '', centerLat: '28.6139', centerLng: '77.2090', radiusKm: 5, gridSize: 3 });
  const [gridResult, setGridResult] = useState(null);
  const [gridLoading, setGridLoading] = useState(false);

  const [napForm, setNapForm] = useState({ businessName: '', phone: '' });
  const [napResult, setNapResult] = useState(null);
  const [napLoading, setNapLoading] = useState(false);

  const [placeId, setPlaceId] = useState('');
  const [reviewLink, setReviewLink] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [sentiment, setSentiment] = useState(null);

  async function handleGeoGrid(e) {
    e.preventDefault();
    setGridLoading(true);
    try {
      const { data } = await localApi.runGeoGrid(workspaceId, siteId, {
        ...gridForm,
        centerLat: Number(gridForm.centerLat),
        centerLng: Number(gridForm.centerLng),
        radiusKm: Number(gridForm.radiusKm),
        gridSize: Number(gridForm.gridSize),
      });
      setGridResult(data.data);
    } catch (err) {
      push(err.response?.data?.message || 'Geo-grid check failed.', 'error');
    } finally {
      setGridLoading(false);
    }
  }

  async function handleNapScan(e) {
    e.preventDefault();
    setNapLoading(true);
    try {
      const { data } = await localApi.napScan(workspaceId, siteId, napForm);
      setNapResult(data.data);
    } catch {
      push('NAP scan failed.', 'error');
    } finally {
      setNapLoading(false);
    }
  }

  async function handleReviewLink(e) {
    e.preventDefault();
    if (!placeId.trim()) return;
    const { data } = await localApi.reviewLink(workspaceId, siteId, placeId.trim());
    setReviewLink(data.data.link);
  }

  async function handleSentiment(e) {
    e.preventDefault();
    if (!reviewText.trim()) return;
    const { data } = await localApi.reviewSentiment(workspaceId, siteId, reviewText.trim());
    setSentiment(data.data);
  }

  return (
    <DashboardLayout title="Local SEO">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          Geo-grid rank tracking, citation scanning, and review tools for {currentSite?.domain}.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs
              tabs={[
                { key: 'geogrid', label: 'Geo-Grid' },
                { key: 'nap', label: 'NAP Scan' },
                { key: 'reviews', label: 'Review Tools' },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
          <div className="p-5">
            {tab === 'geogrid' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleGeoGrid} className="space-y-3">
                  <Input label="Keyword" required value={gridForm.keyword} onChange={(e) => setGridForm({ ...gridForm, keyword: e.target.value })} placeholder="data recovery near me" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Center latitude" required value={gridForm.centerLat} onChange={(e) => setGridForm({ ...gridForm, centerLat: e.target.value })} />
                    <Input label="Center longitude" required value={gridForm.centerLng} onChange={(e) => setGridForm({ ...gridForm, centerLng: e.target.value })} />
                    <Input label="Radius (km)" type="number" value={gridForm.radiusKm} onChange={(e) => setGridForm({ ...gridForm, radiusKm: e.target.value })} />
                    <Input label="Grid size (per side)" type="number" max={7} value={gridForm.gridSize} onChange={(e) => setGridForm({ ...gridForm, gridSize: e.target.value })} />
                  </div>
                  <Button type="submit" loading={gridLoading} icon={MapPin} className="w-full justify-center">Run geo-grid check</Button>
                </form>
                <div>
                  {gridResult ? (
                    <div>
                      <div className="text-2xl font-mono font-bold text-navy">{gridResult.visibilityRate}%</div>
                      <div className="text-xs text-slate mb-4">visible at {gridResult.visiblePoints}/{gridResult.totalPoints} grid points</div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${gridForm.gridSize}, minmax(0, 1fr))` }}>
                        {gridResult.results.map((r) => {
                          const visible = r.local_pack_position !== null || r.organic_position !== null;
                          return (
                            <div
                              key={r.id || `${r.grid_lat}-${r.grid_lng}`}
                              title={`${r.distance_from_center_km}km away`}
                              className={`aspect-square rounded flex items-center justify-center text-[10px] font-mono ${visible ? 'bg-teal-deep text-white' : 'bg-slate/15 text-slate'}`}
                            >
                              {r.local_pack_position || r.organic_position || '—'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No geo-grid data yet" hint="Enter coordinates and click Run — each grid point runs a live local rank check." />
                  )}
                </div>
              </div>
            )}

            {tab === 'nap' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleNapScan} className="space-y-3">
                  <Input label="Business name" required value={napForm.businessName} onChange={(e) => setNapForm({ ...napForm, businessName: e.target.value })} />
                  <Input label="Phone (optional)" value={napForm.phone} onChange={(e) => setNapForm({ ...napForm, phone: e.target.value })} />
                  <Button type="submit" loading={napLoading} icon={ShieldCheck} className="w-full justify-center">Scan directories</Button>
                </form>
                <div>
                  {napResult ? (
                    <div>
                      <div className="text-2xl font-mono font-bold text-navy">{napResult.coveragePercent}%</div>
                      <div className="text-xs text-slate mb-4">listed on {napResult.listedCount}/{napResult.directoriesChecked} directories</div>
                      <div className="space-y-1.5">
                        {napResult.findings.map((f) => (
                          <div key={f.directory} className="flex items-center justify-between text-sm p-2 border-b border-slate/10">
                            <span className="text-navy">{f.directory}</span>
                            <Badge tone={f.found ? 'success' : 'neutral'}>{f.found ? 'Listed' : 'Not found'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No scan run yet" />
                  )}
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <form onSubmit={handleReviewLink} className="space-y-3 mb-4">
                    <Input label="Google Place ID" required value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ..." />
                    <Button type="submit" icon={Star} className="w-full justify-center">Generate review link</Button>
                  </form>
                  {reviewLink && (
                    <a href={reviewLink} target="_blank" rel="noreferrer" className="text-xs font-mono text-teal-deep break-all block p-3 bg-teal-soft rounded-lg">
                      {reviewLink}
                    </a>
                  )}
                </div>
                <div>
                  <form onSubmit={handleSentiment} className="space-y-3 mb-4">
                    <Textarea label="Review text" required rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                    <Button type="submit" icon={MessageSquareHeart} className="w-full justify-center">Analyze sentiment</Button>
                  </form>
                  {sentiment && (
                    <Badge tone={sentiment.sentiment === 'positive' ? 'success' : sentiment.sentiment === 'negative' ? 'danger' : 'neutral'}>
                      {sentiment.sentiment} ({sentiment.positiveWordCount} positive / {sentiment.negativeWordCount} negative signals)
                    </Badge>
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
