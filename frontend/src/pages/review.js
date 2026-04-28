export async function renderReviewPage(rootEl, api) {
    const queue = await api.get('/review/queue');
    const items = queue || [];

    // Enrich items with full data from recent audits
    const recent = await api.get('/dashboard/recent');
    const recentMap = {};
    if (recent) recent.forEach(r => { recentMap[r.audit_id] = r; });
    items.forEach(item => {
        const full = recentMap[item.audit_id];
        if (full) { item.full_input = full.input; }
    });

    // Fetch review stats
    const reviewStats = await api.get('/review/stats');
    const totalReviewed = reviewStats ? ((reviewStats.approved || 0) + (reviewStats.rejected || 0) + (reviewStats.escalated || 0)) : 0;

    rootEl.innerHTML = `
        <div style="display:flex; gap:2rem; border-bottom:1px solid var(--border-glass); margin-bottom:1.5rem; padding-bottom:0.75rem;">
            <a href="#/dashboard" style="color:var(--text-secondary); text-decoration:none; font-size:0.88rem;">Dashboard</a>
            <a href="#/review" style="color:var(--accent-blue); text-decoration:none; font-size:0.88rem; font-weight:600; border-bottom:2px solid var(--accent-blue); padding-bottom:0.75rem; margin-bottom:-0.75rem;">Review Queue</a>
            <a href="#/settings" style="color:var(--text-secondary); text-decoration:none; font-size:0.88rem;">Settings</a>
        </div>

        <!-- Review Stats Bar -->
        <div class="stats-grid" style="margin-bottom:1.5rem;">
            <div class="stat-card purple"><div class="stat-label">Queue Size</div><div class="stat-value purple">${items.length}</div></div>
            <div class="stat-card cyan"><div class="stat-label">Total Reviewed</div><div class="stat-value cyan">${totalReviewed}</div></div>
            <div class="stat-card amber"><div class="stat-label">Approved</div><div class="stat-value amber">${reviewStats?.approved || 0}</div></div>
            <div class="stat-card green"><div class="stat-label">Avg Trust</div><div class="stat-value green">${items.length > 0 ? (items.reduce((s,i) => s + (i.trust_score||0), 0) / items.length * 100).toFixed(0) + '%' : 'N/A'}</div></div>
        </div>

        <div class="grid" style="grid-template-columns:320px 1fr; gap:2rem; align-items:start;">
            <div class="card glass-card" style="padding:1.25rem 1rem;">
                <h3 class="card-title" style="margin-left:0.5rem; margin-bottom:0.75rem;">Flagged Items Queue</h3>
                <div id="queue-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:500px; overflow-y:auto;">
                    ${items.length > 0 ? items.map((item, i) => {
                        const severity = item.trust_score < 0.4 ? 'High' : (item.trust_score < 0.6 ? 'Medium' : 'Low');
                        const sevColor = severity === 'High' ? 'var(--accent-red)' : (severity === 'Medium' ? 'var(--accent-amber)' : 'var(--accent-emerald)');
                        const active = i === 0 ? 'background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3);' : 'background:rgba(255,255,255,0.03); border:1px solid transparent;';
                        const statusBadge = item.status === 'approved' ? '<span style="color:var(--accent-emerald); font-size:0.68rem;">✓ Approved</span>' : 
                                           item.status === 'rejected' ? '<span style="color:var(--accent-red); font-size:0.68rem;">✗ Rejected</span>' : '';
                        return '<div class="queue-item" data-index="' + i + '" style="' + active + ' border-radius:var(--radius-md); padding:0.85rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.2s;"><div><div style="font-weight:600; font-size:0.85rem;">#' + (item.id || item.audit_id || i) + '</div><div style="font-size:0.72rem; color:var(--text-muted);">' + severity + ' Severity</div>' + statusBadge + '</div><div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;"><div style="background:' + sevColor + '; color:white; font-size:0.68rem; font-weight:600; padding:2px 8px; border-radius:4px;">' + severity + '</div><div style="font-size:0.68rem; color:var(--text-muted);">' + (item.trust_score * 100).toFixed(0) + '% trust</div></div></div>';
                    }).join('') : '<div style="color:var(--text-muted); text-align:center; padding:2rem;">✅ No items pending review</div>'}
                </div>
            </div>

            <div class="card glass-card" style="padding:2rem;" id="review-detail">
                ${items.length > 0 ? buildDetailPanel(items[0]) : '<div class="empty-state"><div class="empty-icon">✅</div><h3 class="empty-title">All Clear</h3><div class="empty-desc">No items require human review at this time.</div></div>'}
            </div>
        </div>
    `;

    // Queue item click handlers
    document.querySelectorAll('.queue-item').forEach(el => {
        el.addEventListener('click', () => {
            document.querySelectorAll('.queue-item').forEach(q => { q.style.background='rgba(255,255,255,0.03)'; q.style.border='1px solid transparent'; });
            el.style.background='rgba(59,130,246,0.15)'; el.style.border='1px solid rgba(59,130,246,0.3)';
            const idx = parseInt(el.dataset.index);
            if (items[idx]) {
                document.getElementById('review-detail').innerHTML = buildDetailPanel(items[idx]);
                bindReviewActions(api, items[idx], items, idx);
            }
        });
    });

    if (items.length > 0) bindReviewActions(api, items[0], items, 0);
}

function buildDetailPanel(item) {
    const ts = item.trust_score ? (item.trust_score * 100).toFixed(0) : '??';
    const tsColor = item.trust_score < 0.5 ? 'var(--accent-red)' : (item.trust_score < 0.7 ? 'var(--accent-amber)' : 'var(--accent-emerald)');
    const inputText = item.full_input || item.input_preview || item.input || 'No input data available';
    const outputText = item.corrected_output || item.output || 'AI output was flagged and pending human review before release.';
    const statusText = item.status === 'approved' ? '✅ Approved' : (item.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review');
    const statusColor = item.status === 'approved' ? 'var(--accent-emerald)' : (item.status === 'rejected' ? 'var(--accent-red)' : 'var(--accent-amber)');
    
    // Pipeline steps the item went through
    const pipelineSteps = [
        { name: 'Input Received', icon: '📥', status: 'done' },
        { name: 'Bias Detection', icon: '⚖️', status: 'done' },
        { name: 'Truth Verification', icon: '🔍', status: 'done' },
        { name: 'Trust Scoring', icon: '📊', status: 'done' },
        { name: 'Auto-Correction', icon: '🔧', status: item.trust_score > 0.7 ? 'skipped' : 'done' },
        { name: 'Human Review', icon: '👁️', status: item.status === 'pending' ? 'active' : 'done' },
        { name: 'RLHF Feedback', icon: '🔄', status: item.reviewer_notes ? 'done' : 'pending' },
        { name: 'Release Decision', icon: '🚀', status: item.status === 'approved' ? 'done' : 'pending' },
    ];

    return `
        <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h2 style="font-size:1.15rem; font-weight:600;">Review Item: #${item.id || item.audit_id || '—'}</h2>
            <div style="text-align:right;"><div style="font-size:1rem; font-weight:600;">Trust Score: <span style="color:${tsColor};">${ts}%</span></div><div style="font-size:0.75rem; color:${statusColor};">${statusText}</div></div>
        </div>

        <!-- 8-Step Pipeline Progress -->
        <div style="display:flex; gap:0.15rem; margin-bottom:1.5rem; flex-wrap:wrap;">
            ${pipelineSteps.map(s => {
                const bg = s.status === 'done' ? 'rgba(16,185,129,0.15)' : (s.status === 'active' ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)');
                const border = s.status === 'done' ? 'rgba(16,185,129,0.3)' : (s.status === 'active' ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)');
                const textColor = s.status === 'done' ? 'var(--accent-emerald)' : (s.status === 'active' ? 'var(--accent-blue)' : 'var(--text-muted)');
                return '<div style="flex:1; min-width:80px; text-align:center; background:' + bg + '; border:1px solid ' + border + '; border-radius:6px; padding:0.4rem 0.2rem;"><div style="font-size:0.9rem;">' + s.icon + '</div><div style="font-size:0.62rem; color:' + textColor + '; margin-top:2px;">' + s.name + '</div></div>';
            }).join('')}
        </div>

        <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.88rem; margin-bottom:0.4rem;">AI Input Context</h4>
            <div style="background:rgba(255,255,255,0.05); padding:0.85rem; border-radius:var(--radius-md); font-size:0.82rem; color:var(--text-secondary); border:1px solid rgba(255,255,255,0.1);">${inputText}</div>
        </div>
        <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.88rem; margin-bottom:0.4rem;">AI Output Response</h4>
            <div style="background:rgba(255,255,255,0.05); padding:0.85rem; border-radius:var(--radius-md); font-size:0.82rem; color:var(--text-secondary); border:1px solid rgba(255,255,255,0.1);">${outputText}</div>
        </div>
        <div style="background:rgba(244,63,94,0.05); border:1px solid rgba(244,63,94,0.3); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.5rem;">
            <h4 style="font-size:0.9rem; margin-bottom:0.5rem;">Flagged Reasons & Analysis</h4>
            <div style="font-size:0.82rem; color:var(--text-secondary);">⚠️ Trust score below threshold (${ts}%). Automated checks flagged potential issues for human verification.</div>
            ${item.trust_score < 0.5 ? '<div style="font-size:0.78rem; color:var(--accent-red); margin-top:0.5rem;">🔴 <strong>Critical:</strong> Score is significantly below the 70% safety threshold. Bias and/or hallucination detected.</div>' : ''}
        </div>
        <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem;">
            <button class="btn" id="btn-approve" style="flex:1; background:var(--accent-green); color:white; justify-content:center;">✅ Approve Output</button>
            <button class="btn" id="btn-reject" style="flex:1; background:var(--accent-blue); color:white; justify-content:center;">❌ Reject & Edit</button>
            <button class="btn" id="btn-escalate" style="flex:1; background:var(--accent-red); color:white; justify-content:center;">🚨 Escalate</button>
        </div>
        <div id="action-result" style="display:none; padding:0.75rem; border-radius:var(--radius-md); font-size:0.85rem; margin-bottom:1rem;"></div>
        <div>
            <h4 style="font-size:0.88rem; margin-bottom:0.4rem;">Reviewer Notes & Feedback (RLHF Loop)</h4>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.4rem;">Your feedback is fed back into the model via Reinforcement Learning from Human Feedback (RLHF) to improve future predictions.</p>
            <textarea class="form-textarea" id="review-notes" placeholder="Enter feedback for model improvement... (e.g., 'The bias toward zip-code based scoring should be removed')" style="min-height:80px; background:rgba(255,255,255,0.02);">${item.reviewer_notes || ''}</textarea>
        </div>
    `;
}

function bindReviewActions(api, item, items, idx) {
    const actionResult = document.getElementById('action-result');
    const auditId = item.audit_id || item.id;
    
    const showResult = (msg, color) => {
        actionResult.style.display = 'block';
        actionResult.style.background = color === 'green' ? 'rgba(16,185,129,0.1)' : (color === 'red' ? 'rgba(244,63,94,0.1)' : 'rgba(59,130,246,0.1)');
        actionResult.style.border = '1px solid ' + (color === 'green' ? 'rgba(16,185,129,0.3)' : (color === 'red' ? 'rgba(244,63,94,0.3)' : 'rgba(59,130,246,0.3)'));
        actionResult.style.color = color === 'green' ? 'var(--accent-emerald)' : (color === 'red' ? 'var(--accent-red)' : 'var(--accent-blue)');
        actionResult.textContent = msg;
    };

    const approve = document.getElementById('btn-approve');
    const reject = document.getElementById('btn-reject');
    const escalate = document.getElementById('btn-escalate');

    if (approve) approve.addEventListener('click', async () => {
        const notes = document.getElementById('review-notes')?.value || '';
        approve.disabled = true;
        approve.textContent = '⏳ Processing...';
        const res = await api.post('/review/' + auditId + '/approve', { notes });
        if (res) {
            approve.textContent = '✅ Approved!';
            showResult('✅ Item approved and released. RLHF feedback recorded.', 'green');
            item.status = 'approved';
        } else {
            approve.textContent = '❌ Failed';
            showResult('Failed to approve. Check backend connection.', 'red');
        }
        reject.disabled = true;
        escalate.disabled = true;
    });

    if (reject) reject.addEventListener('click', async () => {
        const notes = document.getElementById('review-notes')?.value || '';
        if (!notes) { showResult('⚠️ Please provide feedback notes for rejection. This is required for RLHF.', 'red'); return; }
        reject.disabled = true;
        reject.textContent = '⏳ Processing...';
        const res = await api.post('/review/' + auditId + '/reject', { notes });
        if (res) {
            reject.textContent = '❌ Rejected';
            showResult('❌ Item rejected. Feedback sent to RLHF pipeline for model improvement.', 'red');
            item.status = 'rejected';
        } else {
            reject.textContent = '❌ Failed';
            showResult('Failed to reject. Check backend connection.', 'red');
        }
        approve.disabled = true;
        escalate.disabled = true;
    });

    if (escalate) escalate.addEventListener('click', async () => {
        const notes = document.getElementById('review-notes')?.value || 'Escalated for senior review';
        escalate.disabled = true;
        escalate.textContent = '⏳ Escalating...';
        const res = await api.post('/review/' + auditId + '/escalate', { notes });
        if (res) {
            escalate.textContent = '🚨 Escalated';
            showResult('🚨 Item escalated to senior reviewer. This case has been flagged for priority review.', 'blue');
        } else {
            escalate.textContent = '🚨 Failed';
            showResult('Failed to escalate. Check backend connection.', 'red');
        }
        approve.disabled = true;
        reject.disabled = true;
    });
}
