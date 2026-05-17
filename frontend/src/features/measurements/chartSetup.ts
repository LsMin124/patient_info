import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

/**
 * Tree-shakeable Chart.js registration. Imported by ForceChart only — keeps
 * the registration out of the global module init so non-chart pages do not
 * pull the chart core into their bundle until they need it.
 *
 * Re-importing this module is safe: Chart.js's `register` is idempotent
 * (it dedupes by element id).
 */
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)
