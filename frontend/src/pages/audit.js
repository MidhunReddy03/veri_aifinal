export async function renderAuditPage(rootEl, api) {
    rootEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">New AI Audit</h3>
            </div>
            <div class="form-group">
                <label class="form-label">Input Data (Text or JSON Dataset)</label>
                <textarea id="audit-input" class="form-textarea" placeholder='Enter a claim to verify, or a JSON dataset: \n{"features": [[1, 5, 3, 50], [0, 2, 4, 30]], "labels": [1, 0], "protected_index": 0}'></textarea>
            </div>
            <button id="btn-run-audit" class="btn btn-primary">
                <span>Run Full Audit</span>
            </button>
        </div>

        <div id="audit-results-container" style="display:none; margin-top:2rem;">
            <!-- Pipeline -->
            <div class="card" style="margin-bottom:1.5rem">
                 <div class="pipeline" id="audit-pipeline">
                    <div class="pipeline-step"><div class="step-circle">1</div><div class="step-label">Bias Scan</div></div>
                    <div class="pipeline-step"><div class="step-circle">2</div><div class="step-label">Truth Check</div></div>
                    <div class="pipeline-step"><div class="step-circle">3</div><div class="step-label">Cluster</div></div>
                    <div class="pipeline-step"><div class="step-circle">4</div><div class="step-label">Distribute</div></div>
                    <div class="pipeline-step"><div class="step-circle">5</div><div class="step-label">Score</div></div>
                    <div class="pipeline-step"><div class="step-circle">6</div><div class="step-label">Correct</div></div>
                 </div>
            </div>

            <div class="grid grid-2">
                <!-- Scores -->
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Audit Results</h3></div>
                    <div style="font-size:3rem; font-family:var(--font-mono); font-weight:700; color:var(--accent-purple); margin-bottom:1.5rem; text-align:center" id="res-trust">0%</div>
                    
                    <div class="score-breakdown">
                        <!-- Truth -->
                        <div class="score-row">
                            <div class="score-label">Truth/Factual</div>
                            <div class="score-bar-track"><div class="score-bar-fill green" id="bar-truth" style="width:0%"></div></div>
                            <div class="score-val" id="val-truth">0</div>
                        </div>
                        <!-- Bias -->
                        <div class="score-row">
                            <div class="score-label">Fairness</div>
                            <div class="score-bar-track"><div class="score-bar-fill amber" id="bar-bias" style="width:0%"></div></div>
                            <div class="score-val" id="val-bias">0</div>
                        </div>
                         <!-- Cluster-->
                        <div class="score-row">
                            <div class="score-label">Cluster DP</div>
                            <div class="score-bar-track"><div class="score-bar-fill cyan" id="bar-cluster" style="width:0%"></div></div>
                            <div class="score-val" id="val-cluster">0</div>
                        </div>
                    </div>
                </div>

                <!-- Explanation / Corrections -->
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Opus Reasoning Log</h3></div>
                    <div class="reasoning-log" id="reasoning-log"></div>
                    
                    <div style="margin-top:1rem; border-top:1px solid var(--border-glass); padding-top:1rem;">
                        <h4 style="font-size:0.85rem; color:var(--accent-green); margin-bottom:0.5rem">Corrected Output</h4>
                        <div id="res-corrected" style="font-size:0.85rem; background:rgba(16,185,129,0.1); padding:0.75rem; border-radius:4px; border:1px solid rgba(16,185,129,0.2)"></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top:1.5rem; text-align:right">
                 <a id="btn-view-report" href="#" class="btn btn-secondary">View Full Report</a>
            </div>
        </div>
    `;

    document.getElementById('btn-run-audit').addEventListener('click', async () => {
        const input = document.getElementById('audit-input').value;
        if (!input) return;
        
        const btn = document.getElementById('btn-run-audit');
        btn.innerHTML = `<span class="loading-spinner"></span> Auditing...`;
        btn.disabled = true;

        // Mock animating the pipeline
        const container = document.getElementById('audit-results-container');
        container.style.display = 'block';
        const steps = document.querySelectorAll('.pipeline-step');
        steps.forEach(s => { s.classList.remove('active', 'complete'); });
        
        let currentStep = 0;
        const intr = setInterval(() => {
            if(currentStep > 0) steps[currentStep-1].classList.replace('active', 'complete');
            if(currentStep < steps.length) steps[currentStep].classList.add('active');
            currentStep++;
        }, 800);

        // API Call
        const result = await api.post('/audit', { input_text: input });
        
        clearInterval(intr);
        steps.forEach(s => { s.classList.remove('active'); s.classList.add('complete'); });
        btn.innerHTML = `<span>Run Full Audit</span>`;
        btn.disabled = false;

        if (result) {
            // Update UI
            document.getElementById('res-trust').textContent = `${(result.trust_score * 100).toFixed(1)}%`;
            
            const truthScore = result.truth.truth_score;
            document.getElementById('bar-truth').style.width = `${truthScore*100}%`;
            document.getElementById('val-truth').textContent = truthScore.toFixed(2);
            
            // Note: Bias score is lower=better. Display fairness as (1-bias)
            const fairness = Math.max(1 - result.bias.bias_score, 0);
            document.getElementById('bar-bias').style.width = `${fairness*100}%`;
            document.getElementById('val-bias').textContent = fairness.toFixed(2);
            
            const clusterF = result.cluster.cluster_fairness;
            document.getElementById('bar-cluster').style.width = `${clusterF*100}%`;
            document.getElementById('val-cluster').textContent = clusterF.toFixed(2);

            document.getElementById('res-corrected').textContent = result.corrections;
            
            const logHtml = result.reasoning_steps.map(s => `
                <div class="step-entry">
                    <span class="step-num">Step ${s.step}</span>
                    <span class="step-name">${s.name} <span class="badge ${s.status === 'complete' ? 'badge-green' : 'badge-amber'}">${s.status}</span></span>
                    <span class="step-detail">${s.detail}</span>
                </div>
            `).join('');
            document.getElementById('reasoning-log').innerHTML = logHtml;
            
            document.getElementById('btn-view-report').href = `#/reports/${result.audit_id}`;
        }
    });
}
