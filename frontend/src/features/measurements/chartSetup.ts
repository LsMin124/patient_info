import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'

/**
 * Tree-shakeable Chart.js registration. Imported by ForceChart only — keeps
 * the registration out of the global module init so non-chart pages do not
 * pull the chart core into their bundle until they need it.
 *
 * Re-importing this module is safe: Chart.js's `register` is idempotent.
 *
 * Title is required for axis title.text rendering — omitting it leaves the
 * axis titles silently invisible in the prod build (the dev Vite bundle
 * auto-registers everything, so the omission only surfaces in production).
 */
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)
