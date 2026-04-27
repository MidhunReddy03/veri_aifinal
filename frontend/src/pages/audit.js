export async function renderAuditPage(rootEl, api) {
    rootEl.innerHTML = `
        <div class="card glass-card">
            <div class="card-header">
                <h3 class="card-title">Initiate AI Audit</h3>
            </div>
            <div class="form-group">
                <label class="form-label" style="display:flex; justify-content:space-between;">
                    <span>Input Payload (Text or JSON Dataset)</span>
                    <span class="badge badge-cyan">Auto-detect</span>
                </label>
                <textarea id="audit-input" class="form-textarea" placeholder='Enter a textual claim or prompt to verify for hallucinations, OR paste a structured JSON containing model predictions to scan for demographic bias.
                
Example JSON:
{
  "features": [[1, 5, 3, 50], [0, 2, 4, 30]],
  "labels": [1, 0],
  "protected_index": 0
}' style="min-height: 180px; font-family: var(--font-mono);"></textarea>
            </div>

            <!-- Depth Selector (Enhancement #1) -->
            <div class="form-group">
                <label class="form-label">Audit Depth</label>
                <div class="depth-selector" id="depth-selector">
                    <button class="depth-btn" data-depth="fast">
                        <span class="depth-label">⚡ Fast</span>
                        <span class="depth-estimate">~1-2s</span>
                    </button>
                    <button class="depth-btn active" data-depth="standard">
                        <span class="depth-label">🔍 Standard</span>
                        <span class="depth-estimate">~3-5s</span>
                    </button>
                    <button class="depth-btn" data-depth="thorough">
                        <span class="depth-label">🔬 Thorough</span>
                        <span class="depth-estimate">~5-10s</span>
                    </button>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted);" id="depth-description">
                    Bias + Truth + Cluster + Distribution — 4 parallel checks
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1rem;">
                <div style="color:var(--text-muted); font-size:0.85rem;">
                    <span style="color:var(--accent-purple);">Powered by</span> Parallel Pipeline v2.0
                </div>
                <button id="btn-run-audit" class="btn btn-action" style="background: var(--gradient-accent); border:none; padding:0.75rem 2rem; font-size:1.1rem; box-shadow: var(--shadow-glow-purple); font-weight:600; color:#fff; border-radius:var(--radius-md);">
                    <span style="display:flex; align-items:center; gap:0.5rem;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Run Full Audit</span>
                </button>
            </div>
        </div>

        <div id="audit-results-container" style="display:none; margin-top:2.5rem; animation: fadeUp 0.5s ease-out;">
            <!-- Live Pipeline Tracking -->
            <div class="card border-glow" style="margin-bottom:2rem; padding:1.5rem;">
                 <div class="pipeline" id="audit-pipeline">
                    <div class="pipeline-step" data-step="1"><div class="step-circle">1</div><div class="step-label">Bias Scan</div></div>
                    <div class="pipeline-step" data-step="2"><div class="step-circle">2</div><div class="step-label">Truth Check</div></div>
                    <div class="pipeline-step" data-step="3"><div class="step-circle">3</div><div class="step-label">Cluster Eval</div></div>
                    <div class="pipeline-step" data-step="4"><div class="step-circle">4</div><div class="step-label">Distribution</div></div>
                    <div class="pipeline-step" data-step="5"><div class="step-circle">5</div><div class="step-label">Trust Score</div></div>
                    <div class="pipeline-step" data-step="6"><div class="step-circle">6</div><div class="step-label">Correction</div></div>
                    <div class="pipeline-step" data-step="7"><div class="step-circle">7</div><div class="step-label">Review</div></div>
                 </div>
            </div>

            <div class="grid grid-2" style="gap:2rem;">
                <!-- Left: Trust Score & Sub-Metrics -->
                <div class="card score-card" style="display:flex; flex-direction:column; justify-content:space-between; box-shadow: var(--shadow-md);">
                    <div>
                        <div class="card-header" style="border-bottom:none; padding-bottom:0;"><h3 class="card-title">Final Trust Score</h3></div>
                        <div style="text-align:center; padding: 2rem 0;">
                            <div class="glow-text" style="font-size:4.5rem; font-family:var(--font-mono); font-weight:700; color:var(--text-primary); text-shadow: var(--shadow-glow-cyan);" id="res-trust">0%</div>
                            <div style="font-size:1rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:0.5rem;" id="res-status-label">Awaiting Result</div>
                            <div id="res-review-badge" style="display:none; margin-top:0.75rem;"></div>
                        </div>
                    </div>
                    
                    <div class="score-breakdown" style="background:rgba(0,0,0,0.2); padding:1.5rem; border-radius:var(--radius-lg); border:1px solid var(--border-glass);">
                        <div class="score-row" style="margin-bottom:1rem; display:flex; align-items:center;">
                            <div class="score-label" style="width:100px; font-weight:600;">Truth Rate</div>
                            <div class="score-bar-track" style="flex:1; height:8px; background:var(--bg-base); border-radius:4px; overflow:hidden;">
                                <div class="score-bar-fill" id="bar-truth" style="width:0%; height:100%; background:var(--gradient-success); transition:width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                            </div>
                            <div class="score-val" id="val-truth" style="width:50px; text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--accent-emerald);">0.00</div>
                        </div>
                        <div class="score-row" style="margin-bottom:1rem; display:flex; align-items:center;">
                            <div class="score-label" style="width:100px; font-weight:600;">Fairness</div>
                            <div class="score-bar-track" style="flex:1; height:8px; background:var(--bg-base); border-radius:4px; overflow:hidden;">
                                <div class="score-bar-fill" id="bar-bias" style="width:0%; height:100%; background:var(--gradient-accent); transition:width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                            </div>
                            <div class="score-val" id="val-bias" style="width:50px; text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--accent-purple);">0.00</div>
                        </div>
                        <div class="score-row" style="display:flex; align-items:center;">
                            <div class="score-label" style="width:100px; font-weight:600;">Confidence</div>
                            <div class="score-bar-track" style="flex:1; height:8px; background:var(--bg-base); border-radius:4px; overflow:hidden;">
                                <div class="score-bar-fill" id="bar-cluster" style="width:0%; height:100%; background:linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); transition:width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                            </div>
                            <div class="score-val" id="val-cluster" style="width:50px; text-align:right; font-family:var(--font-mono); font-weight:600; color:var(--accent-cyan);">0.00</div>
                        </div>
                    </div>
                </div>

                <!-- Right: Explanations & Auto-Correction -->
                <div class="card glass-card" style="box-shadow: var(--shadow-md); display:flex; flex-direction:column;">
                    <div class="card-header"><h3 class="card-title">Audit Log & Auto-Corrections</h3></div>
                    
                    <div class="reasoning-log-wrapper" style="flex:1; overflow-y:auto; max-height:200px; padding-right:10px; margin-bottom:1rem;">
                        <div class="reasoning-log" id="reasoning-log" style="display:flex; flex-direction:column; gap:0.75rem;"></div>
                    </div>
                    
                    <div style="border-top:1px solid var(--border-hover); padding-top:1.5rem;">
                        <h4 style="font-size:0.9rem; color:var(--accent-green); margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> 
                            VeriAI Corrected Output
                        </h4>
                        <div id="res-corrected" style="font-family:var(--font-body); font-size:0.95rem; line-height:1.6; background:rgba(16,185,129,0.05); padding:1rem; border-radius:var(--radius-md); border:1px solid rgba(16,185,129,0.2); color:var(--text-primary); text-shadow: 0 0 1px rgba(255,255,255,0.1);"></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top:2rem; display:flex; justify-content:space-between; align-items:center;">
                <div id="res-elapsed" style="font-size:0.85rem; color:var(--text-muted); font-family:var(--font-mono);"></div>
                <a id="btn-view-report" href="#" class="btn btn-secondary" style="padding:0.75rem 2rem; font-size:1rem; background:rgba(255,255,255,0.05); border:1px solid var(--border-glass); border-radius:var(--radius-md); text-decoration:none; color:var(--text-primary); transition:var(--transition); display:inline-block;">View Detailed Analytics Report</a>
            </div>
        </div>
    `;

    const depthDescriptions = {
        fast: 'Bias + Truth only — 2 parallel checks, fastest response',
        standard: 'Bias + Truth + Cluster + Distribution — 4 parallel checks',
        thorough: 'All checks + full re-evaluation pass — most comprehensive',
    };

    // Bind depth selector
    let selectedDepth = 'standard';
    document.querySelectorAll('#depth-selector .depth-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#depth-selector .depth-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDepth = btn.dataset.depth;
            document.getElementById('depth-description').textContent = depthDescriptions[selectedDepth];

            // Update pipeline steps visibility
            const steps = document.querySelectorAll('#audit-pipeline .pipeline-step');
            steps.forEach(s => {
                const stepNum = parseInt(s.dataset.step);
                if (selectedDepth === 'fast' && (stepNum === 3 || stepNum === 4)) {
                    s.style.opacity = '0.3';
                } else {
                    s.style.opacity = '1';
                }
            });
        });
    });

    document.getElementById('btn-run-audit').addEventListener('click', async () => {
        const input = document.getElementById('audit-input').value;
        if (!input) return;
        
        const btn = document.getElementById('btn-run-audit');
        btn.innerHTML = `<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Auditing Payload...`;
        btn.disabled = true;

        // Show container & animate pipeline
        const container = document.getElementById('audit-results-container');
        container.style.display = 'block';
        const steps = document.querySelectorAll('.pipeline-step');
        steps.forEach(s => { s.classList.remove('active', 'complete'); });
        
        let currentStep = 0;
        const intr = setInterval(() => {
            if(currentStep > 0) steps[currentStep-1].classList.replace('active', 'complete');
            if(currentStep < steps.length) steps[currentStep].classList.add('active');
            currentStep++;
        }, 500);

        // Actual API Call with depth
        const result = await api.post('/audit', { input_text: input, depth: selectedDepth });
        
        clearInterval(intr);
        steps.forEach(s => { s.classList.remove('active'); s.classList.add('complete'); });
        btn.innerHTML = `<span style="display:flex; align-items:center; gap:0.5rem;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Run Full Audit</span>`;
        btn.disabled = false;

        if (result) {
            // Update UI metrics smoothly
            const trustScore = result.trust_score * 100;
            
            // Set dynamic color based on trust
            let trustColor = 'var(--text-primary)';
            let statusText = 'Excellent';
            if(trustScore < 50) { trustColor = 'var(--accent-red)'; statusText = 'Critical Risk'; }
            else if(trustScore < 70) { trustColor = 'var(--accent-amber)'; statusText = 'Needs Review'; }
            else if(trustScore < 85) { trustColor = 'var(--accent-cyan)'; statusText = 'Acceptable'; }
            
            const trustEl = document.getElementById('res-trust');
            trustEl.style.color = trustColor;
            trustEl.textContent = `${trustScore.toFixed(1)}%`;
            
            const statusEl = document.getElementById('res-status-label');
            statusEl.textContent = statusText;
            statusEl.style.color = trustColor;

            // Show human review badge if flagged
            const reviewBadge = document.getElementById('res-review-badge');
            if (result.requires_human_review) {
                reviewBadge.style.display = 'block';
                reviewBadge.innerHTML = `<span class="badge badge-amber" style="font-size: 0.85rem; padding: 0.4rem 1rem;">⚠️ Queued for Human Review</span>`;
            } else {
                reviewBadge.style.display = 'block';
                reviewBadge.innerHTML = `<span class="badge badge-green" style="font-size: 0.85rem; padding: 0.4rem 1rem;">✅ Auto-Approved</span>`;
            }
            
            const truthScore = result.truth.truth_score;
            document.getElementById('bar-truth').style.width = `${truthScore*100}%`;
            document.getElementById('val-truth').textContent = truthScore.toFixed(2);
            
            const fairness = Math.max(1 - result.bias.bias_score, 0);
            document.getElementById('bar-bias').style.width = `${fairness*100}%`;
            document.getElementById('val-bias').textContent = fairness.toFixed(2);
            
            const sysConfidence = result.truth.confidence_score || result.cluster.cluster_fairness || 0.85;
            document.getElementById('bar-cluster').style.width = `${sysConfidence*100}%`;
            document.getElementById('val-cluster').textContent = sysConfidence.toFixed(2);

            let correctedHtml = result.corrections || 'No corrections required.';
            document.getElementById('res-corrected').innerHTML = correctedHtml;
            
            // Show elapsed time
            const elapsedEl = document.getElementById('res-elapsed');
            elapsedEl.textContent = `Completed in ${result.elapsed_seconds}s · Depth: ${result.depth || selectedDepth}`;

            const logHtml = (result.reasoning_steps || []).map(s => `
                <div class="step-entry" style="background:rgba(255,255,255,0.03); padding:0.75rem; border-radius:var(--radius-sm); border-left:3px solid ${s.status === 'complete' ? 'var(--accent-green)' : s.status === 'flagged' ? 'var(--accent-amber)' : s.status === 'skipped' ? 'var(--text-muted)' : 'var(--accent-cyan)'}">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                        <span style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono);">${s.step ? 'Step '+s.step : ''}</span>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            ${s.elapsed ? `<span class="computation-badge"><span class="dot"></span>${(s.elapsed * 1000).toFixed(0)}ms</span>` : ''}
                            <span style="font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:10px; background:rgba(255,255,255,0.1);">${s.status}</span>
                        </div>
                    </div>
                    <div style="font-weight:600; font-size:0.95rem; margin-bottom:0.25rem; color:var(--text-primary);">${s.name}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">${s.detail}</div>
                </div>
            `).join('');
            document.getElementById('reasoning-log').innerHTML = logHtml;
            
            document.getElementById('btn-view-report').href = `#/reports/${result.audit_id}`;
        }
    });
}
