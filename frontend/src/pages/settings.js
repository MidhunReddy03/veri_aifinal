export async function renderSettingsPage(rootEl, api) {
    const config = await api.get('/settings/weights');
    const weights = config?.active_weights || { truth: 0.35, bias: 0.3, confidence: 0.15, cluster: 0.1, distribution: 0.1 };
    const presets = config?.presets || {};

    rootEl.innerHTML = `
        <div style="margin-bottom:1.5rem;">
            <div style="font-size:0.8rem; color:var(--text-muted);">VeriAI Industry Configuration</div>
            <h2 style="font-size:1.4rem; font-weight:700;">Dynamic Trust Formula Configuration</h2>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-top:0.3rem;">
                Adjust how VeriAI calculates the composite Trust Score. The formula: <code style="color:var(--accent-cyan); font-family:var(--font-mono);">Trust = Σ(wᵢ × scoreᵢ)</code> where weights must sum to 1.0.
            </p>
        </div>

        <div class="grid" style="grid-template-columns:1fr 340px; gap:2rem; align-items:start;">
            <div>
                <h3 style="font-size:1rem; font-weight:600; margin-bottom:0.75rem;">Industry Preset Selection</h3>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:2rem;" id="preset-buttons">
                    ${Object.keys(presets).map(key => {
                        const p = presets[key];
                        return '<button class="btn preset-btn" data-preset="' + key + '" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary); font-size:0.82rem; padding:0.5rem 1rem;"><strong>' + p.label + '</strong></button>';
                    }).join('')}
                    <button class="btn preset-btn" data-preset="reset" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--accent-amber); font-size:0.82rem; padding:0.5rem 1rem;">⟳ Reset Defaults</button>
                </div>
                <div id="preset-desc" style="font-size:0.8rem; color:var(--accent-cyan); margin-bottom:1rem; display:none;"></div>

                <h3 style="font-size:1rem; font-weight:600; margin-bottom:1.25rem;">Manual Weight Adjustment</h3>
                <div style="display:flex; flex-direction:column; gap:1.75rem;" id="weight-sliders">
                    ${buildSlider('truth', 'Truth Verification Weight', weights.truth, 'Weight given to factual accuracy and hallucination detection. Higher values penalize hallucinated or unverified claims.')}
                    ${buildSlider('bias', 'Bias Detection Weight', weights.bias, 'Controls importance of fairness and non-discrimination metrics. Critical for HR and lending applications.')}
                    ${buildSlider('confidence', 'Model Confidence Weight', weights.confidence, 'Weight of the model\'s own prediction confidence in the final trust score.')}
                    ${buildSlider('cluster', 'Clustering Anomaly Weight', weights.cluster, 'Focus on identifying anomalous data clusters that may indicate data poisoning or distribution shift.')}
                    ${buildSlider('distribution', 'Distribution Shift Weight', weights.distribution, 'Impact of data representativeness on trust score. Detects training/serving skew.')}
                </div>

                <div style="margin-top:1.5rem; padding:1rem; background:rgba(255,255,255,0.03); border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.08);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.82rem; color:var(--text-muted);">Weight Sum:</span>
                        <span id="weight-sum" style="font-size:0.95rem; font-weight:700; color:var(--accent-emerald);">100%</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Weights should sum to 100% for accurate scoring. Auto-normalized on save.</div>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <div class="card glass-card">
                    <h3 class="card-title" style="margin-bottom:1rem;">Simulated Score Impact</h3>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="position:relative; width:100px; height:100px;">
                            <svg viewBox="0 0 36 36" style="width:100%; height:100%;"><path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/><path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831" fill="none" stroke="var(--accent-blue)" stroke-width="4" stroke-dasharray="85, 100" id="score-ring"/></svg>
                            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:1.3rem; font-weight:700;" id="sim-score">85%</div>
                        </div>
                        <div style="flex:1;">
                            <div style="font-size:0.75rem; color:var(--text-muted);">Dynamic Preview</div>
                            <div style="font-size:0.75rem; color:var(--accent-emerald); margin-top:0.5rem;" id="score-trend">Score Trend: +4%</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.3rem;" id="active-preset">${config?.is_custom ? 'Custom Configuration' : 'Default Preset'}</div>
                        </div>
                    </div>
                </div>

                <div class="card glass-card">
                    <h4 style="font-size:0.9rem; margin-bottom:0.5rem;">📐 Trust Formula</h4>
                    <div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-cyan); line-height:1.8; padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:4px;" id="formula-display">
                        Trust = ${(weights.truth).toFixed(2)}×Truth + ${(weights.bias).toFixed(2)}×Bias + ${(weights.confidence).toFixed(2)}×Conf + ${(weights.cluster).toFixed(2)}×Clust + ${(weights.distribution).toFixed(2)}×Dist
                    </div>
                </div>

                <div class="card glass-card">
                    <h4 style="font-size:0.9rem; margin-bottom:1rem;">Knowledge Base Management</h4>
                    <button class="btn" style="width:100%; background:var(--accent-blue); color:white; justify-content:center; margin-bottom:0.75rem;">Upload CSV Data</button>
                    <button class="btn" style="width:100%; background:transparent; border:1px solid rgba(255,255,255,0.2); color:white; justify-content:center; margin-bottom:1rem;">Connect FAISS Vector Store</button>
                    <div style="font-size:0.78rem; color:var(--text-muted);">Recent: <span style="color:var(--text-secondary);">medical_data_v2.csv</span> <span style="color:var(--accent-emerald);">(Successful)</span></div>
                </div>

                <button class="btn btn-primary" id="save-weights-btn" style="width:100%; justify-content:center;">💾 Save Configuration & Apply</button>
                <div id="save-status" style="text-align:center; font-size:0.85rem; display:none;"></div>
            </div>
        </div>
    `;

    // Update simulated score on slider change
    const updateSimulation = () => {
        const vals = {};
        let sum = 0;
        document.querySelectorAll('.weight-slider').forEach(s => {
            vals[s.dataset.key] = parseInt(s.value);
            sum += parseInt(s.value);
        });
        document.getElementById('weight-sum').textContent = sum + '%';
        document.getElementById('weight-sum').style.color = Math.abs(sum - 100) < 5 ? 'var(--accent-emerald)' : 'var(--accent-red)';
        
        // Simulate a score based on weights
        const simScore = Math.round(vals.truth * 0.7 + vals.bias * 0.85 + vals.confidence * 0.9 + vals.cluster * 0.6 + vals.distribution * 0.75);
        const clampedScore = Math.min(Math.max(simScore, 10), 99);
        document.getElementById('sim-score').textContent = clampedScore + '%';
        document.getElementById('score-ring').setAttribute('stroke-dasharray', clampedScore + ', 100');

        // Update formula
        document.getElementById('formula-display').textContent = 
            'Trust = ' + (vals.truth/100).toFixed(2) + '×Truth + ' + (vals.bias/100).toFixed(2) + '×Bias + ' + (vals.confidence/100).toFixed(2) + '×Conf + ' + (vals.cluster/100).toFixed(2) + '×Clust + ' + (vals.distribution/100).toFixed(2) + '×Dist';
    };

    document.querySelectorAll('.weight-slider').forEach(s => {
        s.addEventListener('input', updateSimulation);
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const preset = btn.dataset.preset;
            const descEl = document.getElementById('preset-desc');
            
            if (preset === 'reset') {
                const res = await api.post('/settings/weights/reset');
                if (res) {
                    const defaults = config?.defaults || { truth: 0.35, bias: 0.3, confidence: 0.15, cluster: 0.1, distribution: 0.1 };
                    applyWeights(defaults);
                    descEl.textContent = '⟳ Reset to default weights.';
                    descEl.style.display = 'block';
                    document.getElementById('active-preset').textContent = 'Default Preset';
                }
            } else if (presets[preset]) {
                const res = await api.post('/settings/weights/preset', { preset });
                const w = presets[preset].weights;
                applyWeights(w);
                descEl.textContent = presets[preset].description;
                descEl.style.display = 'block';
                document.getElementById('active-preset').textContent = presets[preset].label;
            }
            
            document.querySelectorAll('.preset-btn').forEach(b => {
                b.style.borderColor = 'rgba(255,255,255,0.1)';
                b.style.background = 'rgba(255,255,255,0.05)';
            });
            btn.style.borderColor = 'var(--accent-blue)';
            btn.style.background = 'rgba(59,130,246,0.15)';
            updateSimulation();
        });
    });

    function applyWeights(w) {
        Object.keys(w).forEach(k => {
            const slider = document.getElementById('slider-' + k);
            const valEl = document.getElementById('val-' + k);
            if (slider) { slider.value = Math.round(w[k] * 100); valEl.textContent = Math.round(w[k] * 100) + '%'; }
        });
    }

    // Save weights
    document.getElementById('save-weights-btn').addEventListener('click', async () => {
        const data = {};
        document.querySelectorAll('.weight-slider').forEach(s => { data[s.dataset.key] = parseInt(s.value) / 100; });
        const btn = document.getElementById('save-weights-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Saving...';
        const res = await api.post('/settings/weights', data);
        const statusEl = document.getElementById('save-status');
        statusEl.style.display = 'block';
        if (res) { 
            statusEl.textContent = '✅ Weights saved and applied to all future audits!'; 
            statusEl.style.color = 'var(--accent-green)';
            btn.textContent = '✅ Saved!';
            document.getElementById('active-preset').textContent = 'Custom Configuration';
        } else { 
            statusEl.textContent = '❌ Save failed — check backend connection'; 
            statusEl.style.color = 'var(--accent-red)'; 
        }
        setTimeout(() => { statusEl.style.display = 'none'; btn.disabled = false; btn.textContent = '💾 Save Configuration & Apply'; }, 3000);
    });

    updateSimulation();
}

function buildSlider(key, label, value, tooltip) {
    const pct = Math.round((value || 0) * 100);
    return '<div><div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><label style="font-size:0.88rem; color:var(--text-secondary);">' + label + ' <span title="' + tooltip + '" style="cursor:help; color:var(--text-muted);">ℹ️</span></label><span id="val-' + key + '" style="font-size:0.88rem; font-weight:600;">' + pct + '%</span></div><input type="range" class="weight-slider" id="slider-' + key + '" data-key="' + key + '" min="0" max="100" value="' + pct + '" style="width:100%; accent-color:var(--accent-blue);" oninput="document.getElementById(\'val-' + key + '\').textContent=this.value+\'%\'"/></div>';
}
