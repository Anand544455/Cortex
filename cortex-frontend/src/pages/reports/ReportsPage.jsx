import { useState } from 'react';
import { FileDown, TableProperties, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/DataDisplay';
import { Tabs } from '../../components/ui/Overlay';
import { Input, Textarea } from '../../components/ui/Form';
import RequireSite from '../../components/ui/RequireSite';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { reportingApi } from '../../api/reporting';
import client from '../../api/client';

export default function ReportsPage() {
  const { workspaceId, siteId, sitesLoading, currentSite } = useWorkspace();
  const { push } = useToast();
  const [tab, setTab] = useState('export');
  const [days, setDays] = useState(30);
  const [downloading, setDownloading] = useState(false);

  const [seriesInput, setSeriesInput] = useState('10, 9, 8, 7, 6');
  const [forecast, setForecast] = useState(null);
  const [forecasting, setForecasting] = useState(false);

  async function downloadBlob(url, filename) {
    setDownloading(true);
    try {
      const res = await client.get(url.replace(client.defaults.baseURL, ''), { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
    } catch {
      push('Download failed.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  async function handleForecast(e) {
    e.preventDefault();
    const series = seriesInput.split(',').map((v) => ({ value: Number(v.trim()) })).filter((p) => !isNaN(p.value));
    if (series.length < 2) {
      push('Enter at least 2 numbers.', 'error');
      return;
    }
    setForecasting(true);
    try {
      const { data } = await reportingApi.forecast(workspaceId, siteId, { series });
      setForecast(data.data);
    } catch {
      push('Forecast failed.', 'error');
    } finally {
      setForecasting(false);
    }
  }

  return (
    <DashboardLayout title="Reporting">
      <RequireSite siteId={siteId} sitesLoading={sitesLoading}>
        <p className="text-sm text-slate max-w-lg mb-5">
          White-label reports and raw data export for {currentSite?.domain}.
        </p>

        <Card padding="p-0">
          <div className="px-5 pt-5">
            <Tabs tabs={[{ key: 'export', label: 'Export Reports' }, { key: 'forecast', label: 'KPI Forecast' }]} active={tab} onChange={setTab} />
          </div>
          <div className="p-5">
            {tab === 'export' && (
              <div className="space-y-5 max-w-md">
                <Input label="Days to include" type="number" value={days} onChange={(e) => setDays(e.target.value)} />
                <div className="flex flex-col gap-2.5">
                  <Button
                    icon={FileDown}
                    loading={downloading}
                    onClick={() => downloadBlob(reportingApi.pdfUrl(workspaceId, siteId, days), `${currentSite?.domain}-report.pdf`)}
                  >
                    Download PDF report
                  </Button>
                  <Button
                    variant="ghost"
                    icon={TableProperties}
                    onClick={() => downloadBlob(reportingApi.exportCsvUrl(workspaceId, siteId, 'rank-history'), 'rank-history.csv')}
                  >
                    Export rank history (CSV)
                  </Button>
                </div>
                <p className="text-xs text-slate">
                  The PDF pulls together site health, rank history, backlink summary, and AI citation share-of-voice into one branded document.
                </p>
              </div>
            )}

            {tab === 'forecast' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form onSubmit={handleForecast} className="space-y-3">
                  <Textarea
                    label="KPI values, oldest to newest (comma-separated)"
                    rows={3}
                    value={seriesInput}
                    onChange={(e) => setSeriesInput(e.target.value)}
                    placeholder="10, 9, 8, 7, 6"
                  />
                  <Button type="submit" loading={forecasting} icon={TrendingUp} className="w-full justify-center">Generate forecast</Button>
                </form>
                <div>
                  {forecast ? (
                    <div>
                      <div className="text-lg font-mono font-bold text-navy capitalize mb-1">{forecast.trend}</div>
                      <div className="text-xs text-slate mb-4">slope: {forecast.slope} per period</div>
                      <div className="space-y-1.5">
                        {forecast.forecast.map((f) => (
                          <div key={f.index} className="flex justify-between text-sm p-2 bg-slate/5 rounded">
                            <span className="text-slate">Period {f.index}</span>
                            <span className="font-mono text-navy">{f.predictedValue}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate mt-3">
                        Simple linear-regression trend line — a straight-line projection, not a predictive model.
                      </p>
                    </div>
                  ) : (
                    <EmptyState message="No forecast yet" />
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
