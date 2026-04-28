export async function renderAuditPage(rootEl, api) {
    rootEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem;">
            <div>
                <div style="font-size:0.8rem; color:var(--text-muted);">VeriAI > AI Trust & Safety Auditing Platform</div>
                <h2 style="font-size:1.4rem; font-weight:700;">VeriAI Explainability Analysis</h2>
            </div>
            <div id="depth-control" style="display:flex; background:rgba(255,255,255,0.05); border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.1); overflow:hidden;">
                <button class="depth-btn" data-depth="fast" style="background:transparent; border:none; color:var(--text-secondary); padding:0.5rem 1rem; cursor:pointer; font-size:0.85rem;">⚡ Fast</button>
                <button class="depth-btn active" data-depth="standard" style="background:rgba(59,130,246,0.2); border:none; color:var(--accent-blue); padding:0.5rem 1rem; cursor:pointer; font-size:0.85rem; border-left:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.1);">🔍 Standard</button>
                <button class="depth-btn" data-depth="thorough" style="background:transparent; border:none; color:var(--text-secondary); padding:0.5rem 1rem; cursor:pointer; font-size:0.85rem;">🔬 Thorough</button>
            </div>
        </div>

        <!-- Audit Input -->
        <div class="card glass-card" style="margin-bottom:1.5rem;">
            <div class="card-header"><h3 class="card-title">Initiate AI Audit</h3><span class="badge badge-purple">Auto-detect</span></div>
            <div class="form-group">
                <label class="form-label">Input Payload (Text or JSON Dataset)</label>
                <textarea class="form-textarea" id="audit-input" placeholder='Enter a textual claim or prompt to verify for hallucinations, OR paste a structured JSON containing model predictions to scan for demographic bias.

Example JSON:
{
  "features": [[1, 5, 3, 50], [0, 2, 4, 30]],
  "labels": [1, 0],
  "protected_index": 0
}'></textarea>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.85rem; color:var(--accent-purple);">Powered by <strong>Parallel Pipeline v2.0</strong></div>
                <button class="btn btn-primary" id="run-audit-btn">→ Run Full Audit</button>
            </div>
        </div>

        <!-- Results Container -->
        <div id="audit-results"></div>

        <!-- Explainability Analysis (always visible) -->
        <div class="grid grid-2" style="margin-top:1.5rem;">
            <div class="card glass-card">
                <h3 class="card-title" style="margin-bottom:1rem;">SHAP Explainability</h3>
                <div style="font-size:0.82rem; text-align:center; color:var(--text-secondary); margin-bottom:0.75rem;">Feature Contribution to Prediction: Loan Approval Probability (0.82)</div>
                <div id="shap-waterfall" style="display:flex; flex-direction:column; gap:0.4rem;"></div>
            </div>
            <div class="card glass-card">
                <h3 class="card-title" style="margin-bottom:1rem;">Demographic Parity</h3>
                <div style="font-size:0.82rem; text-align:center; color:var(--text-secondary); margin-bottom:0.5rem;">Fairness Across Groups (TPR)</div>
                <div style="height:200px;"><canvas id="parityChart"></canvas></div>
                <div style="font-size:0.82rem; color:var(--text-primary); margin-top:0.75rem;"><strong>Disparity Alert:</strong> Gender and Race show significant disparity.</div>
            </div>
        </div>

        <!-- Auto-Correction -->
        <h3 style="font-size:1.15rem; font-weight:600; margin:1.5rem 0 1rem;">VeriAI Auto-Correction</h3>
        <div class="grid grid-2">
            <div class="card glass-card" style="border-color:rgba(244,63,94,0.4); background:linear-gradient(145deg,rgba(244,63,94,0.05),rgba(10,14,26,0.7));">
                <h4 style="background:rgba(244,63,94,0.2); display:inline-block; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.85rem; margin-bottom:0.75rem;">Original Output</h4>
                <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">The applicant has a high probability of approval. However, due to their zip code and historical data for similar profiles, the system flags a potential risk. Recommended interest rate is 15%.</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem;">
                    <span style="font-size:0.82rem; color:var(--accent-amber); font-weight:600;">⚠️ Bias Detected & Hallucination</span>
                    <button class="btn btn-sm" style="background:var(--accent-blue); color:white;">Apply Correction</button>
                </div>
            </div>
            <div class="card glass-card" style="border-color:rgba(16,185,129,0.4); background:linear-gradient(145deg,rgba(16,185,129,0.05),rgba(10,14,26,0.7));">
                <h4 style="background:rgba(16,185,129,0.2); display:inline-block; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.85rem; margin-bottom:0.75rem;">VeriAI Corrected Output</h4>
                <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">The applicant has a high probability of approval based on credit score, income, and employment history. The system recommends an interest rate of 7.5%. Location data has been excluded to ensure fairness.</p>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem;">
                    <span style="font-size:0.82rem; color:var(--accent-green); font-weight:600;">✓ Corrected, Unbiased & Verified</span>
                    <button class="btn btn-sm" style="background:var(--accent-blue); color:white;">Apply Correction</button>
                </div>
            </div>
        </div>
    `;

    // Depth control
    let selectedDepth = 'standard';
    document.querySelectorAll('.depth-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.depth-btn').forEach(b => { b.style.background='transparent'; b.style.color='var(--text-secondary)'; b.classList.remove('active'); });
            btn.style.background='rgba(59,130,246,0.2)'; btn.style.color='var(--accent-blue)'; btn.classList.add('active');
            selectedDepth = btn.dataset.depth;
        });
    });

    // Run Audit
    document.getElementById('run-audit-btn').addEventListener('click', async () => {
        const input = document.getElementById('audit-input').value.trim();
        if (!input) { alert('Please enter input data.'); return; }
        const resultsEl = document.getElementById('audit-results');
        resultsEl.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><div>Running ' + selectedDepth + ' audit...</div></div>';
        const result = await api.post('/audit', { input, depth: selectedDepth });
        if (result) {
            const ts = (result.trust_score * 100).toFixed(1);
            const color = result.trust_score > 0.8 ? 'var(--accent-green)' : (result.trust_score > 0.5 ? 'var(--accent-amber)' : 'var(--accent-red)');
            resultsEl.innerHTML = '<div class="card glass-card"><div class="card-header"><h3 class="card-title">Audit Result</h3><span class="badge" style="background:rgba(59,130,246,0.15); color:var(--accent-blue);">' + selectedDepth + '</span></div><div style="text-align:center; padding:1rem;"><div style="font-size:2.5rem; font-weight:700; color:' + color + ';">' + ts + '%</div><div style="color:var(--text-muted);">Trust Score</div></div><div style="padding:1rem;"><a href="#/reports/' + result.audit_id + '" class="btn btn-primary" style="width:100%; justify-content:center;">View Full Report →</a></div></div>';
        } else {
            resultsEl.innerHTML = '<div class="card" style="border-color:var(--accent-red);"><div style="padding:1rem; color:var(--accent-red);">Audit failed. Check backend.</div></div>';
        }
    });

    // Build SHAP waterfall
    const features = [
        {name:'Final Score', val:null, pct:100, color:'linear-gradient(90deg,var(--accent-blue),var(--accent-red))'},
        {name:'Credit Score (750)', val:'+0.15', pct:70, color:'var(--accent-green)'},
        {name:'Annual Income ($85k)', val:'+0.12', pct:55, color:'var(--accent-green)'},
        {name:'Years of Exp (5)', val:'+0.08', pct:40, color:'var(--accent-green)'},
        {name:'Education (Master\'s)', val:'+0.05', pct:25, color:'var(--accent-green)'},
        {name:'Loan Amount ($30k)', val:'-0.03', pct:15, color:'var(--accent-red)'},
        {name:'Debt-to-Income (25%)', val:'-0.05', pct:22, color:'var(--accent-red)'},
        {name:'Age (35)', val:'-0.02', pct:10, color:'var(--accent-red)'},
    ];
    const wf = document.getElementById('shap-waterfall');
    wf.innerHTML = features.map(f => '<div style="display:flex; align-items:center; gap:0.75rem;"><div style="width:130px; text-align:right; font-size:0.78rem; color:var(--text-secondary);">' + f.name + '</div><div style="flex:1; height:14px; background:rgba(255,255,255,0.04); border-radius:4px; overflow:hidden;"><div style="height:100%; width:' + f.pct + '%; background:' + f.color + '; border-radius:4px;"></div></div>' + (f.val ? '<div style="width:45px; font-size:0.75rem; font-family:var(--font-mono); color:' + (f.val.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + f.val + '</div>' : '<div style="width:45px;"></div>') + '</div>').join('');

    // Parity Chart
    setTimeout(() => {
        const ctx = document.getElementById('parityChart');
        if (!ctx) return;
        new Chart(ctx, { type:'bar', data:{ labels:['Female','Male','Black','White','Asian','Hispanic','18-25','26-50','51+'], datasets:[{data:[0.48,0.52,0.45,0.55,0.49,0.56,0.48,0.55,0.40], backgroundColor:['#f43f5e','#3b82f6','#f43f5e','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#3b82f6'], borderRadius:4}] }, options:{ responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true,max:0.8,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8'}},x:{grid:{display:false},ticks:{color:'#94a3b8',font:{size:9}}}}, plugins:{legend:{display:false}} } });
    }, 100);
}
