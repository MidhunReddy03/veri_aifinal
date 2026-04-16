import { renderDashboard } from './pages/dashboard.js';
import { renderAuditPage } from './pages/audit.js';
import { renderReportsPage } from './pages/reports.js';
import { renderFeedbackPage } from './pages/feedback.js';

const API_BASE = 'http://localhost:8000/api';

// Simple API Client
export const apiClient = {
    async get(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('API GET Error:', error);
            return null;
        }
    },
    async post(endpoint, data) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('API POST Error:', error);
            return null;
        }
    }
};

// Vanilla SPA Router
const routes = {
    '/dashboard': { render: renderDashboard, title: 'Dashboard' },
    '/audit': { render: renderAuditPage, title: 'Run Audit' },
    '/reports': { render: renderReportsPage, title: 'Audit Reports' },
    '/feedback': { render: renderFeedbackPage, title: 'Feedback' },
};

async function router() {
    let hash = window.location.hash.slice(1) || '/dashboard';
    
    // Check if route has an ID parameter (e.g., /reports/demo-001)
    let id = null;
    let baseRoute = hash;
    const parts = hash.split('/');
    if (parts.length > 2) {
        baseRoute = `/${parts[1]}`;
        id = parts[2];
    }

    const route = routes[baseRoute];
    const appRoot = document.getElementById('app-root');
    const pageTitle = document.getElementById('page-title');

    if (route) {
        // Update UI
        pageTitle.textContent = route.title;
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navEl = document.getElementById(`nav-${baseRoute.substring(1)}`);
        if (navEl) navEl.classList.add('active');
        
        // Render Route
        appRoot.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><div>Loading...</div></div>';
        await route.render(appRoot, apiClient, id);
    } else {
        appRoot.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">404</div>
                <h3 class="empty-title">Page Not Found</h3>
            </div>
        `;
    }
}

// Init
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
