/**
 * Converts an array of flat objects to CSV text - used for the raw
 * data export endpoints (rank history, backlinks, citations, etc. all
 * already come back as arrays of objects from Mongo/Sequelize).
 */
function toCsv(rows) {
  if (!rows || rows.length === 0) return '';

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','));
  });

  return lines.join('\n');
}

module.exports = { toCsv };
