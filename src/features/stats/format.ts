export function formatMinutesShort(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) {
    return `${m}`;
  }
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}g${String(rest).padStart(2, '0')}` : `${h}g`;
}

export function niceTicks(maxValue: number, target = 3, minStep = 1): number[] {
  if (maxValue <= 0) {
    return [0, minStep];
  }
  const rough = maxValue / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const nice = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= rough) ?? 10 * magnitude;
  const step = Math.max(minStep, nice);
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}
