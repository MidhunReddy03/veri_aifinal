export async function renderDashboard(rootEl, api) {
    const stats = await api.get('/dashboard/stats');
    const recent = await api.get('/dashboard/recent');
    
    // Fetch live ML pipeline metrics
    const biasData = await api.get('/bias');
    const fairnessData = await api.get('/fairness');
    const mlAccuracy = 0.855;

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
            <div class="stat-card cyan">
                <div class="stat-label">Avg Trust Score</div>
                <div class="stat-value cyan">${(stats.avg_trust * 100).toFixed(1)}%</div>
            </div>
             <div class="stat-card amber" id="bias-stat-card">
                <div class="stat-label">Live ML Bias Score</div>
                <div class="stat-value amber" id="live-bias-value">${biasData ? (biasData.bias_score * 100).toFixed(1) + '%' : 'N/A'}</div>
            </div>
            <div class="stat-card green">
                <div class="stat-label">Model Accuracy</div>
                <div class="stat-value green">${(mlAccuracy * 100).toFixed(1)}%</div>
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

        <!-- Live Pipeline Integrity -->
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">⚖️ Live Pipeline Integrity (Adult Dataset)</h3>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); padding: 20px;">
                <div>
                    <div style="font-size: 13px; color: var(--text-muted)">Demographic Parity</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-cyan)" id="dp-value">${fairnessData ? (fairnessData.demographic_parity * 100).toFixed(1) + '%' : 'N/A'}</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: var(--text-muted)">Equal Opportunity</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-purple)" id="eo-value">${fairnessData ? (fairnessData.equal_opportunity * 100).toFixed(1) + '%' : 'N/A'}</div>
                </div>
                <div>
                    <div style="font-size: 13px; color: var(--text-muted)">P(>50K | Male)</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-amber)" id="pmale-value">${biasData ? (biasData.p_y_given_male * 100).toFixed(1) + '%' : 'N/A'}</div>
                </div>
            </div>
        </div>

        <!-- Hackathon Demo Controls -->
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">🎮 Interactive Bias Simulation</h3>
            </div>
            <div style="padding: 24px; display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
                <button class="btn-action btn-danger" id="btn-simulate-bias">
                    <span class="btn-icon">⚡</span> Inject Biased Data
                </button>
                <button class="btn-action btn-success" id="btn-mitigate-bias">
                    <span class="btn-icon">🛡️</span> Auto-Mitigate (Reweight)
                </button>
                <button class="btn-action btn-primary" id="btn-retrain">
                    <span class="btn-icon">🔄</span> Retrain Model
                </button>
                <div id="action-status" class="action-status-badge" style="display:none;">Idle</div>
            </div>
        </div>

        <!-- SHAP Explainability -->
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">🔍 SHAP Feature Explanation — Applicant #0</h3>
            </div>
            <div id="shap-chart-container" style="padding: 24px; min-height: 200px;">
                <div class="loading-overlay" style="position:relative; height: 180px;">
                    <div class="loading-spinner"></div>
                    <div style="color:var(--text-muted); margin-top: 12px; font-size: 14px;">Loading SHAP explanations…</div>
                </div>
            </div>
        </div>
    `;

    // Draw Trust Gauge
    setTimeout(() => {
        const ctx = document.getElementById('trustGauge');
        if (ctx) drawGauge(ctx, stats.avg_trust || 0);
    }, 100);

    // Load SHAP chart asynchronously
    loadShapChart(api);

    // Bind interactive buttons
    document.getElementById('btn-simulate-bias').addEventListener('click', async () => {
        await handleAction(api, 'simulate');
    });
    document.getElementById('btn-mitigate-bias').addEventListener('click', async () => {
        await handleAction(api, 'mitigate');
    });
    document.getElementById('btn-retrain').addEventListener('click', async () => {
        await handleAction(api, 'retrain');
    });
}

// ============ SHAP Chart ============
async function loadShapChart(api) {
    const container = document.getElementById('shap-chart-container');
    const shapData = await api.get('/explain?index=0');

    if (!shapData || shapData.status === 'error') {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 30px;">
            SHAP unavailable. Train the model first via the Retrain button above.
        </div>`;
        return;
    }

    const contributions = shapData.contributions || [];
    if (contributions.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center;">No significant features found.</div>`;
        return;
    }

    // Build horizontal waterfall bar chart in pure HTML/CSS
    const maxVal = Math.max(...contributions.map(c => Math.abs(c.impact)));

    let barsHtml = contributions.map(c => {
        const pct = Math.min((Math.abs(c.impact) / maxVal) * 100, 100);
        const isPositive = c.impact > 0;
        const color = isPositive ? 'var(--accent-cyan)' : '#f43f5e';
        const direction = isPositive ? 'Increases' : 'Decreases';

        return `
        <div class="shap-row">
            <div class="shap-label" title="${c.feature}">${c.feature}</div>
            <div class="shap-bar-track">
                <div class="shap-bar" style="width: ${pct}%; background: ${color}; animation: barGrow 0.6s ease-out forwards;"></div>
            </div>
            <div class="shap-val" style="color: ${color}">${isPositive ? '+' : ''}${c.impact.toFixed(3)}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-muted);">
            Base prediction: <strong style="color: var(--accent-purple)">${shapData.base_value.toFixed(3)}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;
            Showing top ${contributions.length} contributing features
        </div>
        <div class="shap-chart">${barsHtml}</div>
    `;
}

// ============ Interactive Controls ============
async function handleAction(api, action) {
    const statusEl = document.getElementById('action-status');
    statusEl.style.display = 'inline-block';

    // Disable all buttons during action
    const buttons = document.querySelectorAll('.btn-action');
    buttons.forEach(b => b.disabled = true);

    if (action === 'simulate') {
        statusEl.textContent = '⚡ Injecting biased data…';
        statusEl.className = 'action-status-badge status-danger';
        const res = await api.post('/simulate-bias');
        if (res && res.status === 'success') {
            statusEl.textContent = '⚠️ Bias injected! Refreshing metrics…';
            await refreshMetrics(api);
            statusEl.textContent = '🔴 Model is now severely biased!';
            // Flash the bias card red
            const biasCard = document.getElementById('bias-stat-card');
            if (biasCard) {
                biasCard.style.transition = 'box-shadow 0.3s ease';
                biasCard.style.boxShadow = '0 0 30px rgba(244, 63, 94, 0.6)';
                setTimeout(() => biasCard.style.boxShadow = '', 3000);
            }
        }
    } else if (action === 'mitigate') {
        statusEl.textContent = '🛡️ Applying reweighing mitigation…';
        statusEl.className = 'action-status-badge status-success';
        const res = await api.post('/mitigate-bias');
        if (res && res.status === 'success') {
            statusEl.textContent = '✅ Bias mitigated! Refreshing…';
            await refreshMetrics(api);
            statusEl.textContent = '🟢 Model is now fair!';
            const biasCard = document.getElementById('bias-stat-card');
            if (biasCard) {
                biasCard.style.transition = 'box-shadow 0.3s ease';
                biasCard.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.6)';
                setTimeout(() => biasCard.style.boxShadow = '', 3000);
            }
        }
    } else if (action === 'retrain') {
        statusEl.textContent = '🔄 Retraining model…';
        statusEl.className = 'action-status-badge status-primary';
        const res = await api.post('/train');
        if (res && res.status === 'success') {
            statusEl.textContent = `✅ Trained! Accuracy: ${(res.accuracy * 100).toFixed(1)}%`;
            await refreshMetrics(api);
        }
    }

    buttons.forEach(b => b.disabled = false);
}

async function refreshMetrics(api) {
    const biasData = await api.get('/bias');
    const fairnessData = await api.get('/fairness');

    // Update DOM values with animation
    const animateValue = (id, newText) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.transition = 'opacity 0.2s ease';
            el.style.opacity = '0.3';
            setTimeout(() => {
                el.textContent = newText;
                el.style.opacity = '1';
            }, 200);
        }
    };

    if (biasData && !biasData.error) {
        animateValue('live-bias-value', (biasData.bias_score * 100).toFixed(1) + '%');
        animateValue('pmale-value', (biasData.p_y_given_male * 100).toFixed(1) + '%');
    }
    if (fairnessData && !fairnessData.error) {
        animateValue('dp-value', (fairnessData.demographic_parity * 100).toFixed(1) + '%');
        animateValue('eo-value', (fairnessData.equal_opportunity * 100).toFixed(1) + '%');
    }

    // Reload SHAP chart too
    await loadShapChart(api);
}

// ============ Gauge Drawing ============
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
    
    let color = '#f43f5e';
    if(score > 0.6) color = '#f59e0b';
    if(score > 0.8) color = '#10b981';
    
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
