import type {DailyChainReport} from '../../lib/daily-analytics';

const labels = {en:'English',es:'Spanish',de:'German'};

export default function DailyChainAnalytics({data}:{data:DailyChainReport}) {
  const {totals,recent,byLanguage,since}=data;
  const metrics = [
    ['Players today',recent[0]?.players ?? 0],
    ['Runs started',totals.starts],
    ['Second attempts',totals.retries],
    ['Chains solved',totals.solved],
    ['Solve rate',totals.ended ? `${(totals.solved/totals.ended*100).toFixed(1)}%` : '—'],
    ['Words per ended run',totals.ended ? (totals.words/totals.ended).toFixed(1) : '—'],
  ] as const;
  return <section className="panel analytics-card">
    <h2>Daily Chain</h2>
    <p className="fine">Challenge days begin at noon Eastern. Linked admin runs are excluded. Solve rate uses runs with a recorded result.</p>
    <div className="analytics-stats">{metrics.map(([label,value])=><div className="analytics-stat" key={label}><span>{label}</span><b>{value.toLocaleString()}</b></div>)}</div>
    {!since?<p className="analytics-empty">No Daily Chain runs recorded yet. Tracking starts with new runs.</p>:<>
      <h3>By language</h3>
      <div className="analytics-table"><table><thead><tr><th>Language</th><th>Starts</th><th>Retries</th><th>Ended</th><th>Solved</th></tr></thead>
        <tbody>{byLanguage.map(row=><tr key={row.language}><th scope="row">{labels[row.language]}</th><td>{row.starts}</td><td>{row.retries}</td><td>{row.ended}</td><td>{row.solved}</td></tr>)}</tbody></table></div>
      <h3>By challenge day</h3>
      <div className="analytics-table"><table><thead><tr><th>Date</th><th>Players</th><th>Starts</th><th>Retries</th><th>Ended</th><th>Solved</th></tr></thead>
        <tbody>{recent.filter(row=>row.starts).map(row=><tr key={row.date}><th scope="row">{row.date}</th><td>{row.players}</td><td>{row.starts}</td><td>{row.retries}</td><td>{row.ended}</td><td>{row.solved}</td></tr>)}</tbody></table></div>
      <p className="fine">Earlier runs weren’t tracked here. Runs abandoned before a result was saved count only as starts.</p>
    </>}
  </section>;
}
