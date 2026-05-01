// Tariff calculation — mirrors backend/app/services/billing.py.

const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

/**
 * @param {object} tariff   tariff_plans row
 * @param {Array}  blocks   tariff_blocks rows (sorted by sort_order)
 * @param {Array}  bands    tariff_time_bands rows (sorted by sort_order)
 * @param {number} kwh      total kWh consumed in the period
 * @param {object} reading  optional { peak_kwh, standard_kwh, off_peak_kwh }
 * @returns {{ energyCharge: number, lineItems: Array }}
 */
export function calculateCharge(tariff, blocks, bands, kwh, reading) {
  const lineItems = [];
  let total = 0;

  if (tariff.type === 'FLAT') {
    const rate = round4(Number(tariff.flat_rate_per_kwh) || 0);
    const amount = round2(rate * kwh);
    lineItems.push({
      label: `Energy @ R${rate.toFixed(4)}/kWh`,
      kwh: round2(kwh),
      rate,
      amount,
    });
    total = amount;
  } else if (tariff.type === 'UNITS_BLOCK') {
    let remaining = kwh;
    const sorted = [...blocks].sort((a, b) => Number(a.from_kwh) - Number(b.from_kwh));
    for (const block of sorted) {
      if (remaining <= 0) break;
      const blockSize =
        block.to_kwh === null || block.to_kwh === undefined
          ? remaining
          : Number(block.to_kwh) - Number(block.from_kwh);
      const consumed = Math.min(remaining, blockSize);
      const rate = round4(Number(block.rate_per_kwh));
      const amount = round2(rate * consumed);
      lineItems.push({
        label: `Block ${block.from_kwh}-${block.to_kwh ?? '∞'} kWh @ R${rate.toFixed(4)}`,
        kwh: round2(consumed),
        rate,
        amount,
      });
      total += amount;
      remaining -= consumed;
    }
  } else if (tariff.type === 'TIME_OF_USE') {
    const splits = {};
    if (reading) {
      if (reading.peak_kwh != null) splits.PEAK = Number(reading.peak_kwh);
      if (reading.standard_kwh != null) splits.STANDARD = Number(reading.standard_kwh);
      if (reading.off_peak_kwh != null) splits.OFF_PEAK = Number(reading.off_peak_kwh);
    }
    if (Object.keys(splits).length === 0 && bands.length > 0) {
      const each = round2(kwh / bands.length);
      for (const b of bands) splits[b.name.toUpperCase()] = each;
    }
    for (const band of bands) {
      const bandKwh = splits[band.name.toUpperCase()] || 0;
      const rate = round4(Number(band.rate_per_kwh));
      const amount = round2(rate * bandKwh);
      lineItems.push({
        label: `${band.name} (${String(band.start_hour).padStart(2, '0')}-${String(
          band.end_hour,
        ).padStart(2, '0')}) @ R${rate.toFixed(4)}/kWh`,
        kwh: round2(bandKwh),
        rate,
        amount,
      });
      total += amount;
    }
  }

  return { energyCharge: round2(total), lineItems };
}

export function periodWindow(billingPeriod, end = new Date()) {
  const days = billingPeriod === 'WEEKLY' ? 7 : 30;
  const start = new Date(end.getTime() - days * 86400_000);
  return { period_start: start.toISOString(), period_end: end.toISOString() };
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * 86400_000);
}
