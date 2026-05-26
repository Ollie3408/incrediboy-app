/**
 * PackCompatibilityPanel — mixability diagnostics content (rendered inside DevDiagnosticsDrawer).
 */

import { useMemo, useState } from 'react'
import {
  analyzeActiveMix,
  analyzePackCuration,
  COMPATIBLE_PACK_LIST,
  DEFAULT_COMPATIBLE_PACK_ID,
  getCompatiblePack,
  getPackStatus,
  validatePackSpine,
} from './index'
import './packCompatibilityPanel.css'

function scoreClass(value: number, invert = false): string {
  const v = invert ? 100 - value : value
  if (v >= 85) return 'pack-compat-panel__score--good'
  if (v >= 70) return 'pack-compat-panel__score--ok'
  return 'pack-compat-panel__score--warn'
}

/** Diagnostic content — all mix analysis UI. */
export function PackCompatibilityPanel() {
  const [packId, setPackId] = useState(DEFAULT_COMPATIBLE_PACK_ID)
  const [simulatedIds, setSimulatedIds] = useState<string[]>([
    'cma-beat-01',
    'cma-bass-01',
    'cma-melody-01',
  ])

  const pack = getCompatiblePack(packId)
  const spineIssues = useMemo(
    () => (pack ? validatePackSpine(pack) : []),
    [pack],
  )

  const curation = useMemo(
    () => (pack ? analyzePackCuration(pack) : []),
    [pack],
  )

  const mixReport = useMemo(
    () => (pack ? analyzeActiveMix(pack, simulatedIds) : null),
    [pack, simulatedIds],
  )

  if (!pack) return null

  const toggleSim = (id: string) => {
    setSimulatedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <div className="pack-compat-panel">
      <div className="pack-compat-panel__toolbar">
        <label className="pack-compat-panel__pack-label">
          Pack
          <select
            className="pack-compat-panel__select"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
            aria-label="Compatible pack"
          >
            <optgroup label="Active">
              {COMPATIBLE_PACK_LIST.filter((p) => getPackStatus(p.id) === 'playable').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Archive">
              {COMPATIBLE_PACK_LIST.filter((p) => getPackStatus(p.id) === 'archived').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [Archived]
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      <p className="pack-compat-panel__meta">
        Spine: {pack.spine.bpm} BPM · {pack.spine.key} · {pack.spine.bars} bars ·{' '}
        {pack.philosophy}
      </p>

      {spineIssues.length > 0 && (
        <ul className="pack-compat-panel__issues">
          {spineIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      {mixReport && (
        <section className="pack-compat-panel__summary">
          <h3 className="pack-compat-panel__section-title">Mix diagnostics</h3>
          <div className="pack-compat-panel__metrics">
            <div>
              <span className="pack-compat-panel__metric-label">BPM match</span>
              <span className={scoreClass(mixReport.averageBpmMatch)}>
                {mixReport.averageBpmMatch}%
              </span>
            </div>
            <div>
              <span className="pack-compat-panel__metric-label">Harmonic score</span>
              <span className={scoreClass(mixReport.averageHarmonicMatch)}>
                {mixReport.averageHarmonicMatch}%
              </span>
            </div>
            <div>
              <span className="pack-compat-panel__metric-label">Low-end conflict</span>
              <span className={scoreClass(mixReport.lowEndConflictPercent, true)}>
                {mixReport.lowEndConflictPercent}%
              </span>
            </div>
            <div>
              <span className="pack-compat-panel__metric-label">Mixability score</span>
              <span className={scoreClass(mixReport.overallMixabilityScore)}>
                {mixReport.overallMixabilityScore}
              </span>
            </div>
          </div>
          {mixReport.warnings.length > 0 && (
            <ul className="pack-compat-panel__warnings">
              {mixReport.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="pack-compat-panel__table-wrap">
        <h3 className="pack-compat-panel__section-title">Pad curation table</h3>
        <table className="pack-compat-panel__table">
          <thead>
            <tr>
              <th>Sim</th>
              <th>Pad</th>
              <th>Cat</th>
              <th>BPM%</th>
              <th>Harm%</th>
              <th>Low%</th>
              <th>Mix</th>
            </tr>
          </thead>
          <tbody>
            {pack.pads.map((pad, i) => {
              const report = curation[i]
              if (!report) return null
              return (
                <tr
                  key={pad.id}
                  className={
                    simulatedIds.includes(pad.id) ? 'pack-compat-panel__row--active' : ''
                  }
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={simulatedIds.includes(pad.id)}
                      onChange={() => toggleSim(pad.id)}
                      aria-label={`Simulate ${pad.label}`}
                    />
                  </td>
                  <td title={pad.notes}>{pad.label}</td>
                  <td>{pad.compatibility.category}</td>
                  <td className={scoreClass(report.bpmMatchPercent)}>{report.bpmMatchPercent}</td>
                  <td className={scoreClass(report.harmonicCompatibilityPercent)}>
                    {report.harmonicCompatibilityPercent}
                  </td>
                  <td className={scoreClass(report.lowEndConflictPercent, true)}>
                    {report.lowEndConflictPercent}
                  </td>
                  <td className={scoreClass(report.overallMixabilityScore)}>
                    {report.overallMixabilityScore}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="pack-compat-panel__future" aria-label="Future diagnostics">
        <h3 className="pack-compat-panel__section-title">Future diagnostics</h3>
        <p className="pack-compat-panel__future-note">
          Loop boundary analysis · FFT density · live slot mapping · replay timeline audit
        </p>
      </section>
    </div>
  )
}
