export async function renderReviewPage(rootEl, api) {
    const [queue, stats] = await Promise.all([
        api.get('/review/queue'),
        api.get('/review/stats'),
    ]);

    const pendingItems = queue ? queue.filter(r => r.status === 'pending') : [];
    const allItems = queue || [];

    rootEl.innerHTML = `
        <!-- Review Stats Cards -->
        <div class="review-stats-grid">
            <div class="review-stat-card">
                <div class="review-stat-number" style="color: var(--accent-amber);">${stats ? stats.pending : 0}</div>
                <div class="review-stat-label">Pending Review</div>
            </div>
            <div class="review-stat-card">
                <div class="review-stat-number" style="color: var(--accent-green);">${stats ? stats.approved : 0}</div>
                <div class="review-stat-label">Approved</div>
            </div>
            <div class="review-stat-card">
                <div class="review-stat-number" style="color: var(--accent-red);">${stats ? stats.rejected : 0}</div>
                <div class="review-stat-label">Rejected</div>
            </div>
        </div>

        <!-- Info Banner -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 1rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
            <svg width="20" height="20" fill="none" stroke="var(--accent-amber)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.997L13.732 4.003c-.77-1.333-2.694-1.333-3.464 0L3.34 16.003c-.77 1.33.192 2.997 1.732 2.997z"/></svg>
            <p style="margin:0; font-size:0.85rem; color:var(--text-primary); line-height:1.4;">
                <strong style="color: var(--accent-amber);">Human-in-the-Loop:</strong> 
                Audit results with trust scores below <strong>60%</strong> are automatically flagged for human review. 
                Approve, reject, or escalate each result before it can be used downstream.
            </p>
        </div>

        <!-- Review Queue Table -->
        <div class="card glass-card" style="box-shadow: var(--shadow-md); overflow: hidden;">
            <div class="card-header" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 1rem;">
                <h3 class="card-title" style="display: flex; align-items: center; gap: 0.75rem;">
                    <svg width="20" height="20" fill="none" stroke="var(--accent-purple)" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Review Queue
                </h3>
                <span class="badge ${pendingItems.length > 0 ? 'badge-amber' : 'badge-green'}">${pendingItems.length} pending</span>
            </div>
            <div class="table-wrap">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-glass); text-align:left; color:var(--text-muted); background: rgba(255,255,255,0.02);">
                            <th style="padding: 12px 16px;">Audit ID</th>
                            <th style="padding: 12px 16px;">Trust Score</th>
                            <th style="padding: 12px 16px;">Input Preview</th>
                            <th style="padding: 12px 16px;">Status</th>
                            <th style="padding: 12px 16px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="review-table-body">
                        ${allItems.length > 0 ? allItems.map(r => renderReviewRow(r)).join('') : `
                            <tr><td colspan="5" style="text-align:center; padding: 40px; color:var(--text-muted);">
                                <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
                                No items in the review queue. All audits are above the trust threshold.
                            </td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Bind action buttons
    bindReviewActions(rootEl, api);
}

function renderReviewRow(r) {
    const severity = r.trust_score < 0.4 ? 'critical' : 'warning';
    const severityColor = severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)';
    const isPending = r.status === 'pending';

    return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" 
            onmouseover="this.style.background='rgba(255,255,255,0.03)'" 
            onmouseout="this.style.background='transparent'"
            data-audit-id="${r.audit_id}">
            <td style="padding: 14px 16px;">
                <a href="#/reports/${r.audit_id}" style="color: var(--accent-cyan); text-decoration: none; font-family: var(--font-mono); font-size: 0.85rem;">${r.audit_id}</a>
            </td>
            <td style="padding: 14px 16px;">
                <span style="font-weight: 700; color: ${severityColor}; font-family: var(--font-mono); font-size: 1.1rem;">
                    ${(r.trust_score * 100).toFixed(1)}%
                </span>
            </td>
            <td style="padding: 14px 16px; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;">
                ${r.input_preview || '—'}
            </td>
            <td style="padding: 14px 16px;">
                <span class="review-status ${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            </td>
            <td style="padding: 14px 16px;">
                ${isPending ? `
                    <div class="review-actions">
                        <button class="review-btn approve" data-action="approve" data-id="${r.audit_id}" title="Approve this result">
                            ✓ Approve
                        </button>
                        <button class="review-btn reject" data-action="reject" data-id="${r.audit_id}" title="Reject this result">
                            ✗ Reject
                        </button>
                    </div>
                ` : `
                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                        ${r.reviewer_notes ? `"${r.reviewer_notes.substring(0, 30)}..."` : 'Reviewed'}
                    </span>
                `}
            </td>
        </tr>
    `;
}

function bindReviewActions(rootEl, api) {
    rootEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('.review-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const auditId = btn.dataset.id;

        if (action === 'reject') {
            // Show modal for rejection notes
            showRejectModal(auditId, api, rootEl);
            return;
        }

        if (action === 'approve') {
            btn.disabled = true;
            btn.textContent = '⏳';
            
            const res = await api.post(`/review/${auditId}/approve`, { notes: '' });
            if (res && res.status === 'success') {
                // Refresh the page
                await renderReviewPage(rootEl, api);
                showReviewToast('✅ Audit approved successfully.', 'var(--accent-green)');
            }
        }
    });
}

function showRejectModal(auditId, api, rootEl) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" fill="none" stroke="var(--accent-red)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.997L13.732 4.003c-.77-1.333-2.694-1.333-3.464 0L3.34 16.003c-.77 1.33.192 2.997 1.732 2.997z"/></svg>
                Reject Audit ${auditId}
            </div>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">
                Please provide a reason for rejecting this audit result. This will be logged for accountability.
            </p>
            <textarea id="reject-notes" class="form-textarea" placeholder="Enter rejection reason..." style="min-height: 100px; border-color: rgba(244, 63, 94, 0.3); background: rgba(0,0,0,0.3);"></textarea>
            <div class="modal-actions">
                <button class="btn-action" id="modal-cancel" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--text-secondary); padding: 0.6rem 1.25rem;">
                    Cancel
                </button>
                <button class="btn-action btn-danger" id="modal-confirm" style="padding: 0.6rem 1.5rem;">
                    Confirm Rejection
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Bind modal events
    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('#modal-confirm').addEventListener('click', async () => {
        const notes = overlay.querySelector('#reject-notes').value;
        if (!notes.trim()) {
            overlay.querySelector('#reject-notes').style.borderColor = 'var(--accent-red)';
            overlay.querySelector('#reject-notes').placeholder = 'Notes are required for rejection!';
            return;
        }

        const btn = overlay.querySelector('#modal-confirm');
        btn.disabled = true;
        btn.textContent = 'Rejecting...';

        const res = await api.post(`/review/${auditId}/reject`, { notes });
        overlay.remove();

        if (res && res.status === 'success') {
            await renderReviewPage(rootEl, api);
            showReviewToast('❌ Audit rejected.', 'var(--accent-red)');
        }
    });
}

function showReviewToast(message, color) {
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
