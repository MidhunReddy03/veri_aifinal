export async function renderReportsPage(rootEl, api, id = null) {
    if (id) {
        // Detailed report view
        renderSingleReport(rootEl, api, id);
    } else {
        // List view
        const recent = await api.get('/dashboard/recent');
        rootEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Audit History</h3>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Report ID</th>
                                <th>Date</th>
                                <th>Input</th>
                                <th>Trust Score</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recent ? recent.map(r => `
                                <tr>
                                    <td><span class="badge badge-purple">${r.audit_id}</span></td>
                                    <td>${r.created_at}</td>
                                    <td>${r.input.length > 50 ? r.input.substring(0,50)+'...' : r.input}</td>
                                    <td><span style="color:${r.trust_score > 0.7 ? 'var(--accent-green)' : 'var(--accent-amber)'}">${(r.trust_score*100).toFixed(1)}%</span></td>
                                    <td>
                                        <a href="#/reports/${r.audit_id}" class="btn btn-sm btn-secondary">View Dets</a>
                                    </td>
                                </tr>
                            `).join('') : `<tr><td colspan="5">No reports found</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

async function renderSingleReport(rootEl, api, id) {
    const report = await api.get(`/report/${id}`);
    if (!report || report.error) {
        rootEl.innerHTML = `<div class="empty-state">Report not found</div>`;
        return;
    }

    // Since /report returns a simplified record, we render what we have.
    // In a full DB, we'd store the full JSON.
    rootEl.innerHTML = `
        <div style="margin-bottom:1rem"><a href="#/reports" style="color:var(--text-muted); text-decoration:none">← Back to Reports</a></div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Audit Report: ${report.audit_id}</h3>
                <span class="badge badge-purple">${report.created_at}</span>
            </div>
            
            <div class="grid grid-2" style="margin-top:1.5rem">
                <div>
                    <h4 style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem">Original Input</h4>
                    <div style="background:var(--bg-input); padding:1rem; border-radius:4px; font-size:0.85rem; font-family:var(--font-mono); margin-bottom:1.5rem; word-break:break-all">
                        ${report.input}
                    </div>
                     <h4 style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem">Corrected Output</h4>
                    <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); padding:1rem; border-radius:4px; font-size:0.85rem; color:var(--accent-green)">
                        ${report.corrected || 'No corrections applied.'}
                    </div>
                </div>
                
                <div>
                    <div class="stat-card purple" style="margin-bottom:1rem">
                        <div class="stat-label">Final Trust Score</div>
                        <div class="stat-value purple">${(report.trust_score*100).toFixed(1)}%</div>
                    </div>
                    <div class="grid grid-2" style="gap:1rem">
                         <div class="stat-card cyan" style="padding:1rem">
                            <div class="stat-label">Truth Score</div>
                            <div class="stat-value cyan" style="font-size:1.5rem">${(report.truth_score*100).toFixed(1)}%</div>
                        </div>
                        <div class="stat-card amber" style="padding:1rem">
                            <div class="stat-label">Bias Penalty</div>
                            <div class="stat-value amber" style="font-size:1.5rem">${(report.bias_score*100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
