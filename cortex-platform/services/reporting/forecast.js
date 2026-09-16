/**
 * Ordinary least-squares linear regression over a time series - used
 * for "where is this KPI trending" forecast lines. Deliberately simple
 * and transparent: a straight-line trend projection, not a predictive
 * model. Good for "are we trending up or down and by roughly how
 * much", not for precise forecasting of any single future data point.
 */
function linearForecast(series, pointsToForecast = 4) {
  if (series.length < 2) {
    return { slope: 0, intercept: series[0]?.value || 0, forecast: [], note: 'Need at least 2 data points to forecast.' };
  }

  const n = series.length;
  const xValues = series.map((_, i) => i);
  const yValues = series.map((p) => p.value);

  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  for (let i = 0; i < pointsToForecast; i++) {
    const x = n + i;
    forecast.push({ index: x, predictedValue: Math.round((slope * x + intercept) * 100) / 100 });
  }

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 100) / 100,
    trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'flat',
    forecast,
  };
}

module.exports = { linearForecast };
