export async function renderDashboard(rootEl, api) {
    const stats = await api.get('/dashboard/stats');
    const recent = await api.get('/dashboard/recent');
    
    if (!stats) {
        rootEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">Failed to load dashboard data</h3></div>`;
        return;
    }

    rootEl.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card purple">
                <div class="stat-label">Total Audits</div>
                <div class="stat-value purple">${stats.total_audits || 0}</div>
            </div>
            <div class="stat-card amber">
                <div class="stat-label">Avg Trust Score</div>
                <div class="stat-value amber">${(stats.avg_trust * 100).toFixed(1)}%</div>
            </div>
             <div class="stat-card cyan">
                <div class="stat-label">Avg Bias Score</div>
                <div class="stat-value cyan">${(stats.avg_bias * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card green">
                <div class="stat-label">Human Feedback</div>
                <div class="stat-value green">${stats.total_feedback || 0}</div>
            </div>
        </div>

        <div class="grid grid-2">
            <!-- Gauge Card -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">System Trust Level</h3>
                </div>
                <div class="gauge-container">
                    <canvas id="trustGauge" class="gauge-canvas"></canvas>
                    <div class="gauge-label">Global Trust Metric</div>
                </div>
            </div>

            <!-- Recent Audits Card -->
             <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Audits</h3>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Input Snippet</th>
                                <th>Trust Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recent && recent.length > 0 ? recent.map(r => `
                                <tr>
                                    <td><a href="#/reports/${r.audit_id}" style="color:var(--accent-cyan)">${r.audit_id}</a></td>
                                    <td>${r.input.length > 40 ? r.input.substring(0,40)+'...' : r.input}</td>
                                    <td>${(r.trust_score*100).toFixed(1)}%</td>
                                </tr>
                            `).join('') : `<tr><td colspan="3" style="text-align:center">No audits found</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Draw Gauge
    setTimeout(() => {
        const ctx = document.getElementById('trustGauge');
        if (ctx) drawGauge(ctx, stats.avg_trust || 0);
    }, 100);
}

function drawGauge(canvas, score) {
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const cx = 100;
    const cy = 100;
    const radius = 80;
    const startAngle = 0.8 * Math.PI;
    const endAngle = 2.2 * Math.PI;

    // Background Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value Arc
    const valAngle = startAngle + (endAngle - startAngle) * score;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valAngle);
    ctx.lineWidth = 15;
    
    // Color gradient based on score
    let color = '#f43f5e'; // red
    if(score > 0.6) color = '#f59e0b'; // amber
    if(score > 0.8) color = '#10b981'; // green
    
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Text
    ctx.fillStyle = color;
    ctx.font = 'bold 36px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${(score*100).toFixed(0)}`, cx, cy);
    
    ctx.font = '12px Inter';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('SCORE', cx, cy + 30);
}
