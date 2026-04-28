export async function renderLogin(rootEl, api) {
    // Remove default padding from content-area for login
    rootEl.style.padding = '0';
    rootEl.style.height = '100vh';
    rootEl.style.overflow = 'hidden';
    
    rootEl.innerHTML = `
        <div style="position:fixed; inset:0; background:#050510; z-index:0;">
            <div style="position:absolute; inset:0; background-image:linear-gradient(rgba(100,100,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(100,100,255,0.08) 1px,transparent 1px); background-size:80px 80px; transform:perspective(600px) rotateX(60deg) scale(2.5) translateY(-100px); transform-origin:center top;"></div>
            <div style="position:absolute; inset:0; background:linear-gradient(to top,transparent 20%,#050510 90%);"></div>
        </div>
        <div style="position:relative; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh;">
            <h1 style="font-size:3.5rem; font-weight:700; color:#fff; text-shadow:0 0 20px rgba(6,182,212,0.8),0 0 60px rgba(6,182,212,0.4); margin-bottom:2.5rem; letter-spacing:2px; font-family:var(--font-body);">VeriAI</h1>
            <div style="width:100%; max-width:400px; background:rgba(15,20,35,0.85); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-lg); padding:2.5rem 2rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" style="color:#e2e8f0;">Email</label>
                        <input type="email" class="form-input" placeholder="Email" required style="background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);" />
                    </div>
                    <div class="form-group" style="margin-bottom:2rem;">
                        <label class="form-label" style="color:#e2e8f0;">Password</label>
                        <input type="password" class="form-input" placeholder="Password" required style="background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);" />
                    </div>
                    <button type="submit" style="width:100%; padding:0.85rem; border-radius:999px; background:linear-gradient(90deg,#8b5cf6,#3b82f6); color:white; font-weight:600; font-size:1rem; border:none; cursor:pointer;">Continue</button>
                    <a href="#" style="display:block; text-align:center; margin-top:1.5rem; color:#60a5fa; font-size:0.85rem; text-decoration:none;">Forgot Password?</a>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        rootEl.style.padding = '';
        rootEl.style.height = '';
        rootEl.style.overflow = '';
        window.location.hash = '/dashboard';
    });
}
