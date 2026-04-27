export async function renderDashboard(rootEl, api) {
    const stats = await api.get('/dashboard/stats');
    const recent = await api.get('/dashboard/recent');
    const reviewStats = await api.get('/review/stats');
    
    // Fetch live ML pipeline metrics
    const biasData = await api.get('/bias');
    const fairnessData = await api.get('/fairness');
    const mlAccuracy = 0.855;
    const pendingReviews = reviewStats ? reviewStats.pending : 0;

    if (!stats) {
        rootEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">Failed to load dashboard data</h3></div>`;
        return;
    }

    // Update pending badge in sidebar
    updatePendingBadge(pendingReviews);

    rootEl.innerHTML = `
        <!-- Hero Stats Row -->
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
            <div class="stat-card ${pendingReviews > 0 ? 'amber' : 'green'}">
                <div class="stat-label">Pending Reviews</div>
                <div class="stat-value ${pendingReviews > 0 ? 'amber' : 'green'}" id="pending-count">${pendingReviews}</div>
            </div>
        </div>

        <!-- Quick Action Cards (Dashboard Navigation Hub) -->
        <div class="quick-actions-grid">
            <a href="#/audit" class="quick-action-card" id="qa-audit">
                <div class="qa-icon purple">🔍</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Run Audit
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Launch a full trust & bias audit with configurable depth control</div>
                </div>
            </a>
            <a href="#/reports" class="quick-action-card" id="qa-reports">
                <div class="qa-icon cyan">📋</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Audit Reports
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Browse past audit reports and compare before/after scores</div>
                </div>
            </a>
            <a href="#/review" class="quick-action-card" id="qa-review">
                <div class="qa-icon ${pendingReviews > 0 ? 'red' : 'green'}">👁️</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Review Queue ${pendingReviews > 0 ? `<span class="pending-badge">${pendingReviews}</span>` : ''}
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Human-in-the-loop verification for low-trust results</div>
                </div>
            </a>
            <a href="#/settings" class="quick-action-card" id="qa-settings">
                <div class="qa-icon blue">⚙️</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Settings
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Configure trust formula weights & industry presets</div>
                </div>
            </a>
            <a href="#/feedback" class="quick-action-card" id="qa-feedback">
                <div class="qa-icon green">💬</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Feedback Loop
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Submit human review assessments to the RLHF pipeline</div>
                </div>
            </a>
            <div class="quick-action-card" id="qa-simulator" style="cursor:pointer;">
                <div class="qa-icon amber">🎮</div>
                <div class="qa-content">
                    <div class="qa-title">
                        Bias Simulator
                        <svg class="qa-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <div class="qa-desc">Interactive bias injection & auto-mitigation demo</div>
                </div>
            </div>
        </div>

        <hr class="section-divider" />

        <div class="grid grid-2">
            <!-- Gauge Card (Global Trust) -->
            <div class="card glass-card" style="box-shadow: var(--shadow-md);">
                <div class="card-header">
                    <h3 class="card-title">System Trust Level</h3>
                </div>
                <div class="gauge-container" style="position:relative; display:flex; justify-content:center; align-items:center; height: 220px;">
                    <canvas id="trustChart" style="max-height: 200px;"></canvas>
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
                        <div id="chart-inner-text" style="font-size:2.5rem; font-weight:bold; color:var(--text-primary);">0%</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">SCORE</div>
                    </div>
                </div>
            </div>

            <!-- Pipeline Metrics Radar -->
            <div class="card glass-card" style="box-shadow: var(--shadow-md);">
                <div class="card-header">
                    <h3 class="card-title">Fairness & Truth Radar</h3>
                </div>
                <div style="height: 220px; display:flex; justify-content:center; align-items:center;">
                    <canvas id="radarChart" style="max-height: 200px;"></canvas>
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

        <!-- Bias Simulation Panel (hidden by default, shown when Simulator card clicked) -->
        <div class="card" style="margin-top: 20px; display:none;" id="sim-panel">
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

        <!-- Recent Audits Card -->
        <div class="card glass-card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">Recent Audits Log</h3>
            </div>
            <div class="table-wrap">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-glass); text-align:left; color:var(--text-muted);">
                            <th style="padding: 10px;">ID</th>
                            <th style="padding: 10px;">Input Snippet</th>
                            <th style="padding: 10px;">Trust Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recent && recent.length > 0 ? recent.map(r => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                                <td style="padding: 12px 10px;"><a href="#/reports/${r.audit_id}" style="color:var(--accent-cyan); text-decoration:none; font-family:var(--font-mono);">${r.audit_id}</a></td>
                                <td style="padding: 12px 10px; color:var(--text-secondary); max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.input}</td>
                                <td style="padding: 12px 10px;">
                                    <span class="badge ${r.trust_score > 0.8 ? 'badge-green' : (r.trust_score > 0.5 ? 'badge-amber' : 'badge-red')}">${(r.trust_score*100).toFixed(1)}%</span>
                                </td>
                            </tr>
                        `).join('') : `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">No audits found</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SHAP Explainability with Method Selector -->
        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">🔍 SHAP Feature Explanation — Applicant #0</h3>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="method-selector" id="shap-method-selector">
                        <button class="method-btn active" data-method="linear">Linear</button>
                        <button class="method-btn" data-method="coefficient">Coeff</button>
                        <button class="method-btn" data-method="permutation">Perm</button>
                    </div>
                    <div class="computation-badge" id="shap-compute-badge" style="display:none;">
                        <span class="dot"></span>
                        <span id="shap-compute-time">0ms</span>
                    </div>
                </div>
            </div>
            <div id="shap-chart-container" style="padding: 24px; min-height: 200px;">
                <div class="loading-overlay" style="position:relative; height: 180px;">
                    <div class="loading-spinner"></div>
                    <div style="color:var(--text-muted); margin-top: 12px; font-size: 14px;">Loading SHAP explanations…</div>
                </div>
            </div>
        </div>
    `;

    // Initialize Custom Charts
    setTimeout(() => {
        initCharts(stats.avg_trust || 0, biasData, fairnessData);
    }, 100);

    // Load SHAP chart asynchronously
    loadShapChart(api, 'linear');

    // Bind SHAP method selector
    document.querySelectorAll('#shap-method-selector .method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#shap-method-selector .method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadShapChart(api, btn.dataset.method);
        });
    });

    // Bind Simulator card to toggle panel
    document.getElementById('qa-simulator').addEventListener('click', () => {
        const panel = document.getElementById('sim-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            panel.style.animation = 'fadeUp 0.3s ease-out';
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            panel.style.display = 'none';
        }
    });

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

// ============ Pending Badge Helper ============
function updatePendingBadge(count) {
    const navReview = document.getElementById('nav-review');
    if (navReview) {
        const existing = navReview.querySelector('.pending-badge');
        if (existing) existing.remove();
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'pending-badge';
            badge.textContent = count;
            navReview.appendChild(badge);
        }
    }
}

// ============ SHAP Chart ============
async function loadShapChart(api, method = 'linear') {
    const container = document.getElementById('shap-chart-container');
    container.innerHTML = `<div class="loading-overlay" style="position:relative; height: 180px;">
        <div class="loading-spinner"></div>
        <div style="color:var(--text-muted); margin-top: 12px; font-size: 14px;">Computing ${method} explanations…</div>
    </div>`;

    const shapData = await api.get(`/explain?index=0&method=${method}`);
    const badge = document.getElementById('shap-compute-badge');

    if (!shapData || shapData.status === 'error') {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 30px;">
            SHAP unavailable. Train the model first via the Retrain button above.
        </div>`;
        return;
    }

    // Show computation badge
    if (badge) {
        badge.style.display = 'inline-flex';
        const timeMs = shapData.computation_time ? (shapData.computation_time * 1000).toFixed(0) : '?';
        document.getElementById('shap-compute-time').textContent = 
            `${timeMs}ms${shapData.from_cache ? ' (cached)' : ''} · ${shapData.method || method}`;
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

    // Reload SHAP chart with currently selected method
    const activeMethod = document.querySelector('#shap-method-selector .method-btn.active');
    await loadShapChart(api, activeMethod ? activeMethod.dataset.method : 'linear');
}

// ============ Advanced Chart.js Integrations ============
let trustChartInstance = null;
let radarChartInstance = null;

function initCharts(score, bias, fairness) {
    const tCtx = document.getElementById('trustChart');
    if (tCtx) {
        document.getElementById('chart-inner-text').textContent = (score*100).toFixed(1)+'%';
        
        let color = '#f43f5e';
        if(score > 0.6) color = '#f59e0b';
        if(score > 0.8) color = '#10b981';

        trustChartInstance = new Chart(tCtx, {
            type: 'doughnut',
            data: {
                labels: ['Trust Score', 'Deficit'],
                datasets: [{
                    data: [score*100, (1-score)*100],
                    backgroundColor: [color, 'rgba(255,255,255,0.05)'],
                    borderWidth: 0,
                    borderRadius: [10, 0]
                }]
            },
            options: {
                cutout: '80%',
                rotation: -120,
                circumference: 240,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }

    const rCtx = document.getElementById('radarChart');
    if (rCtx) {
        let f1 = fairness ? Math.max((1 - bias?.bias_score)*100, 0) : 62;
        let p_male = bias ? (bias.p_y_given_male*100) : 40;
        let eo = fairness ? (fairness.equal_opportunity*100) : 55;
        
        radarChartInstance = new Chart(rCtx, {
            type: 'radar',
            data: {
                labels: ['Fairness', 'Eq. Opp', "P(M)"],
                datasets: [{
                    label: 'Current Pipeline',
                    data: [f1, eo, p_male],
                    backgroundColor: 'rgba(167, 139, 250, 0.2)',
                    borderColor: 'rgba(167, 139, 250, 1)',
                    pointBackgroundColor: '#06b6d4',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
                        ticks: { display: false, max: 100 }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}
