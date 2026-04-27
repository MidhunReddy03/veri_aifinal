export async function renderSettingsPage(rootEl, api) {
    const data = await api.get('/settings/weights');
    
    if (!data) {
        rootEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3 class="empty-title">Failed to load settings</h3></div>`;
        return;
    }

    const weights = data.active_weights;
    const presets = data.presets;
    const isCustom = data.is_custom;

    const presetIcons = {
        general: '🌐',
        healthcare: '🏥',
        finance: '🏦',
        hiring: '👥',
    };

    rootEl.innerHTML = `
        <div class="grid grid-2" style="gap: 2rem;">
            <!-- Trust Formula Editor -->
            <div class="card glass-card" style="box-shadow: var(--shadow-md);">
                <div class="card-header" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 1rem; margin-bottom: 1rem;">
                    <h3 class="card-title" style="display:flex; align-items:center; gap:0.75rem;">
                        <svg width="20" height="20" fill="none" stroke="var(--accent-purple)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                        Trust Formula Weights
                    </h3>
                    <span class="badge ${isCustom ? 'badge-cyan' : 'badge-green'}">${isCustom ? 'Custom' : 'Default'}</span>
                </div>

                <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                    <strong style="color: var(--accent-purple);">Trust Score</strong> = Σ(weight<sub>i</sub> × metric<sub>i</sub>)
                    <br/>Adjust the sliders to change how each component contributes to the final trust score. Weights are auto-normalized to sum to 1.0.
                </div>

                <div class="weight-slider-group" id="weight-sliders">
                    ${['truth', 'bias', 'confidence', 'cluster', 'distribution'].map(key => `
                        <div class="weight-slider-row">
                            <div class="weight-slider-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                            <div class="weight-slider-track">
                                <input type="range" min="0" max="100" value="${Math.round(weights[key] * 100)}" 
                                       data-key="${key}" class="weight-slider" />
                            </div>
                            <div class="weight-slider-value" id="wv-${key}">${(weights[key] * 100).toFixed(0)}%</div>
                        </div>
                    `).join('')}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-glass);">
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        Total: <strong id="weight-total" style="color: var(--accent-cyan); font-family: var(--font-mono);">100%</strong>
                    </div>
                    <div style="display: flex; gap: 0.75rem;">
                        <button id="btn-reset-weights" class="btn-action" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--text-secondary); padding: 0.6rem 1.25rem;">
                            Reset to Defaults
                        </button>
                        <button id="btn-save-weights" class="btn-action btn-primary" style="padding: 0.6rem 1.5rem;">
                            Save & Apply
                        </button>
                    </div>
                </div>
            </div>

            <!-- Industry Presets + Radar Preview -->
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div class="card glass-card" style="box-shadow: var(--shadow-md);">
                    <div class="card-header" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 1rem; margin-bottom: 1rem;">
                        <h3 class="card-title" style="display:flex; align-items:center; gap:0.75rem;">
                            <svg width="20" height="20" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            Industry Presets
                        </h3>
                    </div>
                    <div class="preset-grid" id="preset-grid">
                        ${Object.entries(presets).map(([key, preset]) => `
                            <div class="preset-card" data-preset="${key}" id="preset-${key}">
                                <div class="preset-icon">${presetIcons[key] || '📊'}</div>
                                <div class="preset-name">${preset.label}</div>
                                <div class="preset-desc">${preset.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Weight Distribution Radar -->
                <div class="card glass-card" style="box-shadow: var(--shadow-md);">
                    <div class="card-header">
                        <h3 class="card-title">Weight Distribution Preview</h3>
                    </div>
                    <div style="height: 220px; display:flex; justify-content:center; align-items:center;">
                        <canvas id="weightRadarChart" style="max-height: 200px;"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize radar chart
    let radarInstance = null;
    const radarCtx = document.getElementById('weightRadarChart');
    if (radarCtx) {
        radarInstance = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Truth', 'Bias', 'Confidence', 'Cluster', 'Distribution'],
                datasets: [{
                    label: 'Active Weights',
                    data: [weights.truth * 100, weights.bias * 100, weights.confidence * 100, weights.cluster * 100, weights.distribution * 100],
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
                        pointLabels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
                        ticks: { display: false, max: 50 },
                        suggestedMin: 0,
                        suggestedMax: 50,
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateRadarChart() {
        if (!radarInstance) return;
        const sliders = document.querySelectorAll('.weight-slider');
        const values = {};
        sliders.forEach(s => { values[s.dataset.key] = parseInt(s.value); });
        radarInstance.data.datasets[0].data = [values.truth, values.bias, values.confidence, values.cluster, values.distribution];
        radarInstance.update();
    }

    // Bind slider events
    document.querySelectorAll('.weight-slider').forEach(slider => {
        slider.addEventListener('input', () => {
            const key = slider.dataset.key;
            document.getElementById(`wv-${key}`).textContent = `${slider.value}%`;
            
            // Update total
            const sliders = document.querySelectorAll('.weight-slider');
            let total = 0;
            sliders.forEach(s => { total += parseInt(s.value); });
            const totalEl = document.getElementById('weight-total');
            totalEl.textContent = `${total}%`;
            totalEl.style.color = Math.abs(total - 100) <= 2 ? 'var(--accent-green)' : 'var(--accent-red)';
            
            updateRadarChart();
        });
    });

    // Bind preset cards
    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', async () => {
            const presetKey = card.dataset.preset;
            
            // Visual selection
            document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Apply preset to sliders
            const presetWeights = presets[presetKey].weights;
            Object.entries(presetWeights).forEach(([key, val]) => {
                const slider = document.querySelector(`input[data-key="${key}"]`);
                if (slider) {
                    slider.value = Math.round(val * 100);
                    document.getElementById(`wv-${key}`).textContent = `${Math.round(val * 100)}%`;
                }
            });
            
            document.getElementById('weight-total').textContent = '100%';
            document.getElementById('weight-total').style.color = 'var(--accent-green)';
            updateRadarChart();
        });
    });

    // Save weights
    document.getElementById('btn-save-weights').addEventListener('click', async () => {
        const btn = document.getElementById('btn-save-weights');
        const defaultText = btn.innerHTML;
        btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Saving…';
        btn.disabled = true;

        const sliders = document.querySelectorAll('.weight-slider');
        const rawWeights = {};
        let total = 0;
        sliders.forEach(s => {
            rawWeights[s.dataset.key] = parseInt(s.value);
            total += parseInt(s.value);
        });

        // Normalize to fractions
        const normalized = {};
        Object.entries(rawWeights).forEach(([k, v]) => {
            normalized[k] = v / total;
        });

        const res = await api.post('/settings/weights', normalized);
        
        btn.innerHTML = defaultText;
        btn.disabled = false;

        if (res && res.status === 'success') {
            showToast('✅ Trust weights updated successfully!', 'var(--accent-green)');
        } else {
            showToast('❌ Failed to update weights.', 'var(--accent-red)');
        }
    });

    // Reset weights
    document.getElementById('btn-reset-weights').addEventListener('click', async () => {
        const res = await api.post('/settings/weights/reset');
        if (res && res.status === 'success') {
            showToast('🔄 Weights reset to defaults.', 'var(--accent-cyan)');
            // Refresh the page
            renderSettingsPage(rootEl, api);
        }
    });
}

// Toast utility
function showToast(message, color) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.style.background = 'rgba(17, 24, 39, 0.95)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.border = `1px solid ${color}`;
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = 'var(--radius-md)';
    toast.style.fontSize = '0.9rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    toast.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
    
    toast.innerHTML = `<div style="width:8px; height:8px; border-radius:50%; background:${color}"></div> ${message}`;
    
    toastContainer.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
