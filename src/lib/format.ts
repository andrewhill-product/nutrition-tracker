/** "38 min", "1 hr", "1 hr 5 min" */
export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Thousands-separated integer: 9432 -> "9,432" */
export function intLabel(value: number): string {
  return Math.round(value).toLocaleString("en-GB");
}
