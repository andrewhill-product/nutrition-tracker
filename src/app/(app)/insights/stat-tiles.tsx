/** Compact stat tiles: logging streak, scored-day hit rate, plan adherence. */
export function StatTiles({
  streak,
  totalLogged,
  onTrack,
  scored,
  planFollowed,
  planTotal,
}: {
  streak: number;
  totalLogged: number;
  onTrack: number;
  scored: number;
  planFollowed: number;
  planTotal: number;
}) {
  const milestone =
    totalLogged >= 100 ? "100 day club" : totalLogged >= 30 ? "30 day club" : totalLogged >= 7 ? "7 day club" : null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl border border-line bg-surface p-3 text-center">
        <p className="tnum text-2xl font-bold">{streak}</p>
        <p className="text-[11px] text-muted">
          {streak === 1 ? "day" : "days"} logged in a row
        </p>
        {milestone && (
          <p className="mt-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {milestone}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-3 text-center">
        <p className="tnum text-2xl font-bold">
          {scored > 0 ? `${onTrack}/${scored}` : "0"}
        </p>
        <p className="text-[11px] text-muted">
          {scored > 0 ? "days on track, last 4 weeks" : "scored days yet"}
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-3 text-center">
        <p className="tnum text-2xl font-bold">
          {planTotal > 0 ? `${planFollowed}/${planTotal}` : "0"}
        </p>
        <p className="text-[11px] text-muted">
          {planTotal > 0 ? "planned dinners followed" : "planned dinners yet"}
        </p>
      </div>
    </div>
  );
}
