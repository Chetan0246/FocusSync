/* ============================================================
   FocusSync - Analytics Dashboard Script (public/js/analytics.js)
   Syllabus Topics Covered:
   ─ CO2: DOM manipulation (getElementById, Chart.js canvas)
   ─ CO2: XMLHttpRequest AJAX (NOT fetch/axios)
   ─ CO4: Chart.js CDN integration (external library usage)
   ─ CO1: JavaScript array methods (map, reduce, filter)
   ─ CO5: Data visualization concepts (bar, line, doughnut charts)
   ─ CO1: Modular function design
   ============================================================ */


// ── Wait for Chart.js CDN to be ready ────────────────────────
// All chart logic runs after DOMContentLoaded (wired from dashboard.html)

/**
 * initAnalytics(sessions)
 * Entry point called from dashboard.html after sessions are loaded via AJAX.
 * @param {Array} sessions - array of session objects from /api/sessions
 */
function initAnalytics(sessions) {
  if (!sessions || sessions.length === 0) {
    document.getElementById('analytics-section').style.display = 'none';
    return;
  }

  // Show the analytics section (hidden by default until data loads)
  document.getElementById('analytics-section').style.display = 'block';

  renderFocusScoreChart(sessions);    // Bar chart: score per session
  renderDistractionTrendChart(sessions); // Line chart: distractions over time
  renderScoreDistributionChart(sessions); // Doughnut chart: score bands
  renderHeatmap(sessions);            // Simple CSS heatmap grid
}


// ══════════════════════════════════════════════════════════════
// CHART 1: FOCUS SCORE BAR CHART
// CO4: Chart.js bar chart — shows score for each session
// ══════════════════════════════════════════════════════════════
function renderFocusScoreChart(sessions) {
  var canvas = document.getElementById('chart-focus-score');
  if (!canvas) return;

  // CO1: Array.map() to extract labels & data
  var labels = sessions.map(function (s, i) {
    return 'S' + (i + 1);  // Session labels: S1, S2, ...
  });

  var scores = sessions.map(function (s) {
    return s.focusScore !== undefined ? s.focusScore : 100;
  });

  // Assign bar colour based on score (green/yellow/red)
  var colors = scores.map(function (score) {
    if (score >= 80) return 'rgba(74, 222, 128, 0.7)';   // success green
    if (score >= 50) return 'rgba(250, 204, 21, 0.7)';   // warning yellow
    return 'rgba(248, 113, 113, 0.7)';                    // danger red
  });

  // CO4: new Chart() — Chart.js API
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Focus Score (%)',
        data: scores,
        backgroundColor: colors,
        borderColor: colors.map(function (c) { return c.replace('0.7', '1'); }),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800 },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#9090b0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#9090b0', font: { size: 11 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { labels: { color: '#e0e0ef' } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return 'Score: ' + ctx.parsed.y + '%'; }
          }
        }
      }
    }
  });
}


// ══════════════════════════════════════════════════════════════
// CHART 2: DISTRACTION TREND LINE CHART
// CO4: Chart.js line chart — distractions per session over time
// ══════════════════════════════════════════════════════════════
function renderDistractionTrendChart(sessions) {
  var canvas = document.getElementById('chart-distractions');
  if (!canvas) return;

  var labels = sessions.map(function (s, i) { return 'S' + (i + 1); });
  var data   = sessions.map(function (s) { return s.distractions || 0; });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Distractions',
        data: data,
        fill: true,
        tension: 0.4,                                   // smooth curve
        backgroundColor: 'rgba(248, 113, 113, 0.15)',
        borderColor: 'rgba(248, 113, 113, 0.9)',
        pointBackgroundColor: 'rgba(248, 113, 113, 1)',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 800 },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#9090b0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#9090b0', font: { size: 11 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { labels: { color: '#e0e0ef' } }
      }
    }
  });
}


// ══════════════════════════════════════════════════════════════
// CHART 3: SCORE DISTRIBUTION DOUGHNUT
// CO4: Chart.js doughnut chart — categorises sessions by score band
// ══════════════════════════════════════════════════════════════
function renderScoreDistributionChart(sessions) {
  var canvas = document.getElementById('chart-score-dist');
  if (!canvas) return;

  // CO1: Array.filter() to count sessions in each band
  var excellent = sessions.filter(function (s) { return (s.focusScore || 100) >= 80; }).length;
  var good      = sessions.filter(function (s) { var sc = s.focusScore || 100; return sc >= 50 && sc < 80; }).length;
  var poor      = sessions.filter(function (s) { return (s.focusScore || 100) < 50; }).length;

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Excellent (≥80%)', 'Good (50–79%)', 'Needs Work (<50%)'],
      datasets: [{
        data: [excellent, good, poor],
        backgroundColor: [
          'rgba(74, 222, 128, 0.75)',
          'rgba(250, 204, 21, 0.75)',
          'rgba(248, 113, 113, 0.75)'
        ],
        borderColor: ['#4ade80', '#facc15', '#f87171'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      animation: { duration: 800 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#e0e0ef', padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var total = excellent + good + poor;
              var pct   = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
              return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}


// ══════════════════════════════════════════════════════════════
// HEATMAP: SESSION ACTIVITY CALENDAR
// CO2: DOM manipulation — build a grid of coloured divs
// CO1: Date object, getDay(), toLocaleDateString()
// ══════════════════════════════════════════════════════════════
function renderHeatmap(sessions) {
  var container = document.getElementById('heatmap-grid');
  if (!container) return;

  // Count sessions per day (key: YYYY-MM-DD string)
  var dayCounts = {};
  sessions.forEach(function (s) {
    if (!s.startTime) return;
    var d = new Date(s.startTime).toLocaleDateString('en-CA'); // YYYY-MM-DD
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });

  // Build last 35 days grid (5 weeks)
  container.innerHTML = '';
  var today = new Date();
  for (var i = 34; i >= 0; i--) {
    var d    = new Date(today);
    d.setDate(today.getDate() - i);
    var key  = d.toLocaleDateString('en-CA');
    var cnt  = dayCounts[key] || 0;

    var cell        = document.createElement('div');
    cell.className  = 'heatmap-cell';
    cell.title      = key + ': ' + cnt + ' session(s)';

    // Intensity based on count
    if (cnt === 0)      cell.style.backgroundColor = 'rgba(108,99,255,0.07)';
    else if (cnt === 1) cell.style.backgroundColor = 'rgba(108,99,255,0.35)';
    else if (cnt === 2) cell.style.backgroundColor = 'rgba(108,99,255,0.60)';
    else                cell.style.backgroundColor = 'rgba(108,99,255,0.90)';

    container.appendChild(cell);
  }
}
