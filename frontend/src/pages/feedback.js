export async function renderFeedbackPage(rootEl, api) {
    const history = await api.get('/feedback/history');

    rootEl.innerHTML = `
        <div class="grid grid-2">
            <div class="card">
                 <div class="card-header">
                    <h3 class="card-title">Submit Feedback</h3>
                </div>
                <div class="form-group">
                    <label class="form-label">Audit ID</label>
                    <input type="text" id="fb-audit-id" class="form-input" placeholder="e.g. demo-001" />
                </div>
                <div class="form-group" style="display:flex; gap:1.5rem">
                    <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem">
                        <input type="checkbox" id="fb-correct" checked /> Output was correct / satisfactory
                    </label>
                    <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem">
                        <input type="checkbox" id="fb-bias" /> Did you notice remaining bias?
                    </label>
                </div>
                <div class="form-group">
                    <label class="form-label">Additional Notes</label>
                    <textarea id="fb-notes" class="form-textarea" placeholder="Explain what went wrong..."></textarea>
                </div>
                <button id="btn-submit-fb" class="btn btn-primary">Submit Feedback</button>
                <div id="fb-msg" style="margin-top:1rem; font-size:0.85rem; color:var(--accent-green)"></div>
            </div>

            <div class="card">
                 <div class="card-header">
                    <h3 class="card-title">Recent Feedback</h3>
                </div>
                 <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Audit ID</th>
                                <th>Status</th>
                                <th>Bias Flag</th>
                            </tr>
                        </thead>
                        <tbody id="fb-table-body">
                            ${history && history.length > 0 ? history.slice(0, 5).map(h => `
                                <tr>
                                    <td><span class="badge badge-purple">${h.audit_id}</span></td>
                                    <td>${h.correct ? '<span style="color:var(--accent-green)">Correct</span>' : '<span style="color:var(--accent-red)">Incorrect</span>'}</td>
                                    <td>${h.bias_flag ? '<span class="badge badge-red">Yes</span>' : '<span class="badge badge-green">No</span>'}</td>
                                </tr>
                            `).join('') : `<tr><td colspan="3">No feedback yet</td></tr>`}
                        </tbody>
                    </table>
                </div>
                <p style="text-align:right; margin-top:1rem; font-size:0.8rem; color:var(--text-muted)">
                    System auto-retrains when sufficient feedback is gathered.
                </p>
            </div>
        </div>
    `;

    document.getElementById('btn-submit-fb').addEventListener('click', async () => {
        const payload = {
            audit_id: document.getElementById('fb-audit-id').value || 'unknown',
            correct: document.getElementById('fb-correct').checked,
            bias_flag: document.getElementById('fb-bias').checked,
            notes: document.getElementById('fb-notes').value
        };
        const res = await api.post('/feedback', payload);
        if (res) {
            const msgEl = document.getElementById('fb-msg');
            msgEl.textContent = res.status === 'received_and_retrained' 
                ? 'Feedback received. System weights recalibrated based on volume!' 
                : 'Feedback received successfully.';
            setTimeout(() => { msgEl.textContent = ''; }, 4000);
            
            // Refresh table
            const newHistory = await api.get('/feedback/history');
            document.getElementById('fb-table-body').innerHTML = newHistory.slice(0, 5).map(h => `
                <tr>
                    <td><span class="badge badge-purple">${h.audit_id}</span></td>
                    <td>${h.correct ? '<span style="color:var(--accent-green)">Correct</span>' : '<span style="color:var(--accent-red)">Incorrect</span>'}</td>
                    <td>${h.bias_flag ? '<span class="badge badge-red">Yes</span>' : '<span class="badge badge-green">No</span>'}</td>
                </tr>
            `).join('');
        }
    });

}
