import type { Template } from './types';

type GenerationCallbacks = {
  onStatus: (status: string) => void;
};

function detectCategory(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('shop') || p.includes('store') || p.includes('product') || p.includes('cart') || p.includes('ecommerce') || p.includes('e-commerce')) return 'e-commerce';
  if (p.includes('dashboard') || p.includes('analytics') || p.includes('chart') || p.includes('stats')) return 'dashboard';
  if (p.includes('landing') || p.includes('hero') || p.includes('cta') || p.includes('call to action')) return 'landing-page';
  return 'landing-page';
}

function generateEcommerce(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShopHub — Modern Store</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{background:#f8fafc;color:#0f172a}
.header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px}
.logo span{color:#f97316}
.nav{display:flex;gap:24px}
.nav a{color:#475569;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.nav a:hover{color:#0f172a}
.cart-btn{position:relative;background:#0f172a;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:transform .2s}
.cart-btn:hover{transform:scale(1.05)}
.cart-count{position:absolute;top:-6px;right:-6px;background:#f97316;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700}
.hero{text-align:center;padding:60px 24px 40px;background:linear-gradient(135deg,#fffbeb,#fef3c7)}
.hero h1{font-size:42px;font-weight:800;margin-bottom:12px;letter-spacing:-1px}
.hero p{font-size:18px;color:#78716c;max-width:600px;margin:0 auto}
.products{max-width:1200px;margin:0 auto;padding:40px 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
.product-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);transition:all .3s;cursor:pointer;border:1px solid #f1f5f9}
.product-card:hover{transform:translateY(-4px);box-shadow:0 12px 24px rgba(0,0,0,0.1)}
.product-img{width:100%;height:200px;object-fit:cover;background:linear-gradient(135deg,#f1f5f9,#e2e8f0)}
.product-img-placeholder{width:100%;height:200px;display:flex;align-items:center;justify-content:center;font-size:48px;background:linear-gradient(135deg,#fef3c7,#fde68a)}
.product-info{padding:16px}
.product-name{font-size:16px;font-weight:600;margin-bottom:4px}
.product-cat{font-size:12px;color:#94a3b8;margin-bottom:8px}
.product-price{font-size:20px;font-weight:800;color:#f97316}
.product-desc{font-size:13px;color:#64748b;margin:8px 0 12px;line-height:1.5}
.add-btn{width:100%;background:#0f172a;color:#fff;border:none;padding:10px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s}
.add-btn:hover{background:#f97316}
.cart-drawer{position:fixed;top:0;right:-400px;width:380px;height:100vh;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,0.15);transition:right .3s;z-index:200;display:flex;flex-direction:column}
.cart-drawer.open{right:0}
.cart-overlay{position:fixed;top:0;left:0;width:100%;height:100vh;background:rgba(0,0,0,0.4);z-index:150;opacity:0;visibility:hidden;transition:all .3s}
.cart-overlay.open{opacity:1;visibility:visible}
.cart-header{padding:20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.cart-header h2{font-size:18px;font-weight:700}
.close-btn{background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8}
.cart-items{flex:1;overflow-y:auto;padding:16px}
.cart-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9}
.cart-item-img{width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;font-size:24px}
.cart-item-info{flex:1}
.cart-item-name{font-size:14px;font-weight:600}
.cart-item-price{font-size:14px;color:#f97316;font-weight:700}
.cart-item-qty{display:flex;align-items:center;gap:8px;margin-top:4px}
.qty-btn{background:#f1f5f9;border:none;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600}
.cart-footer{padding:20px;border-top:1px solid #e2e8f0}
.cart-total{display:flex;justify-content:space-between;font-size:18px;font-weight:700;margin-bottom:16px}
.checkout-btn{width:100%;background:#f97316;color:#fff;border:none;padding:14px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:transform .2s}
.checkout-btn:hover{transform:scale(1.02)}
.empty-cart{text-align:center;color:#94a3b8;padding:40px}
@media(max-width:768px){.nav{display:none}.hero h1{font-size:28px}.products{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="header">
<div class="logo">Shop<span>Hub</span></div>
<div class="nav"><a href="#">Home</a><a href="#">Shop</a><a href="#">Deals</a><a href="#">About</a></div>
<button class="cart-btn" onclick="toggleCart()">Cart <span class="cart-count" id="cartCount">0</span></button>
</div>
<div class="hero">
<h1>Shop Smarter, Live Better</h1>
<p>Discover premium products at unbeatable prices. Free shipping on orders over EGP 500.</p>
</div>
<div class="products" id="products"></div>
<div class="cart-overlay" id="overlay" onclick="toggleCart()"></div>
<div class="cart-drawer" id="drawer">
<div class="cart-header"><h2>Shopping Cart</h2><button class="close-btn" onclick="toggleCart()">&times;</button></div>
<div class="cart-items" id="cartItems"></div>
<div class="cart-footer">
<div class="cart-total"><span>Total</span><span id="total">EGP 0</span></div>
<button class="checkout-btn" onclick="checkout()">Checkout</button>
</div>
</div>
<script>
const products=[
{name:"Wireless Headphones",cat:"Electronics",price:1299,emoji:"🎧",desc:"Premium noise-cancelling over-ear headphones with 30hr battery."},
{name:"Smart Watch Pro",cat:"Wearables",price:2499,emoji:"⌚",desc:"Health tracking, GPS, and a vibrant AMOLED display."},
{name:"Coffee Maker",cat:"Home",price:899,emoji:"☕",desc:"Barista-grade espresso machine with milk frother."},
{name:"Running Shoes",cat:"Sports",price:749,emoji:"👟",desc:"Lightweight breathable sneakers for everyday runs."},
{name:"Backpack Elite",cat:"Accessories",price:599,emoji:"🎒",desc:"Water-resistant 30L backpack with USB charging port."},
{name:"Sunglasses",cat:"Fashion",price:399,emoji:"🕶️",desc:"UV400 polarized lenses with a timeless design."},
{name:"Mechanical Keyboard",cat:"Electronics",price:1199,emoji:"⌨️",desc:"Hot-swappable switches with RGB backlighting."},
{name:"Yoga Mat",cat:"Fitness",price:249,emoji:"🧘",desc:"Eco-friendly non-slip mat with alignment guides."}
];
let cart=[];
function renderProducts(){document.getElementById('products').innerHTML=products.map((p,i)=>\`<div class="product-card" onclick="addToCart(\${i})"><div class="product-img-placeholder">\${p.emoji}</div><div class="product-info"><div class="product-name">\${p.name}</div><div class="product-cat">\${p.cat}</div><div class="product-desc">\${p.desc}</div><div class="product-price">EGP \${p.price}</div><button class="add-btn" onclick="event.stopPropagation();addToCart(\${i})">Add to Cart</button></div></div>\`).join('')}
function addToCart(i){cart.push(i);updateCart()}
function removeFromCart(j){cart.splice(j,1);updateCart()}
function updateCart(){document.getElementById('cartCount').textContent=cart.length;const items=document.getElementById('cartItems');if(cart.length===0){items.innerHTML='<div class="empty-cart">Your cart is empty</div>'}else{items.innerHTML=cart.map((pi,j)=>{const p=products[pi];return \`<div class="cart-item"><div class="cart-item-img">\${p.emoji}</div><div class="cart-item-info"><div class="cart-item-name">\${p.name}</div><div class="cart-item-price">EGP \${p.price}</div><button class="qty-btn" onclick="removeFromCart(\${j})">Remove</button></div></div>\`}).join('')}const total=cart.reduce((s,pi)=>s+products[pi].price,0);document.getElementById('total').textContent='EGP '+total}
function toggleCart(){document.getElementById('drawer').classList.toggle('open');document.getElementById('overlay').classList.toggle('open')}
function checkout(){if(cart.length===0){alert('Your cart is empty!');return}alert('Checkout complete! Total: EGP '+cart.reduce((s,pi)=>s+products[pi].price,0));cart=[];updateCart();toggleCart()}
renderProducts();updateCart();
</script>
</body>
</html>`;
}

function generateDashboard(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Analytics Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{display:flex;background:#f8fafc;color:#0f172a;min-height:100vh}
.sidebar{width:240px;background:#0f172a;color:#fff;padding:24px 0;min-height:100vh;position:fixed}
.sidebar-logo{padding:0 24px 24px;font-size:20px;font-weight:800;color:#fff}
.sidebar-logo span{color:#f97316}
.nav-item{padding:12px 24px;color:#94a3b8;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s;display:flex;align-items:center;gap:12px;border-left:3px solid transparent}
.nav-item:hover{background:#1e293b;color:#fff}
.nav-item.active{background:#1e293b;color:#f97316;border-left-color:#f97316}
.main{flex:1;margin-left:240px;padding:32px}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px}
.page-header h1{font-size:28px;font-weight:800}
.btn{background:#0f172a;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:32px}
.stat-card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #f1f5f9}
.stat-label{font-size:13px;color:#94a3b8;font-weight:500;margin-bottom:8px}
.stat-value{font-size:32px;font-weight:800;letter-spacing:-1px}
.stat-change{font-size:12px;margin-top:8px;font-weight:600}
.stat-change.up{color:#16a34a}
.stat-change.down{color:#dc2626}
.charts{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:32px}
.chart-card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #f1f5f9}
.chart-title{font-size:16px;font-weight:700;margin-bottom:20px}
.bar-chart{display:flex;align-items:flex-end;gap:12px;height:200px;padding-top:20px}
.bar{flex:1;background:linear-gradient(180deg,#f97316,#fdba74);border-radius:8px 8px 0 0;position:relative;transition:all .3s;cursor:pointer;min-height:20px}
.bar:hover{opacity:.8;transform:scaleY(1.05)}
.bar-label{position:absolute;bottom:-24px;left:0;right:0;text-align:center;font-size:11px;color:#94a3b8}
.donut{display:flex;align-items:center;justify-content:center;height:200px}
.donut-chart{width:160px;height:160px;border-radius:50%;background:conic-gradient(#f97316 0% 45%,#0ea5e9 45% 75%,#16a34a 75% 100%);position:relative}
.donut-chart::after{content:'';position:absolute;top:30px;left:30px;width:100px;height:100px;border-radius:50%;background:#fff}
.donut-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:1}
.donut-center .num{font-size:24px;font-weight:800}
.donut-center .lbl{font-size:11px;color:#94a3b8}
.legend{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.legend-item{display:flex;align-items:center;gap:8px;font-size:13px}
.legend-dot{width:12px;height:12px;border-radius:4px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 16px;font-size:12px;color:#94a3b8;font-weight:600;border-bottom:1px solid #e2e8f0}
td{padding:12px 16px;font-size:14px;border-bottom:1px solid #f1f5f9}
.badge{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.badge.active{background:#dcfce7;color:#16a34a}
.badge.pending{background:#fef3c7;color:#d97706}
.badge.failed{background:#fee2e2;color:#dc2626}
@media(max-width:768px){.sidebar{display:none}.main{margin-left:0}.charts{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="sidebar">
<div class="sidebar-logo">Dash<span>Board</span></div>
<div class="nav-item active">Overview</div>
<div class="nav-item">Analytics</div>
<div class="nav-item">Customers</div>
<div class="nav-item">Products</div>
<div class="nav-item">Orders</div>
<div class="nav-item">Settings</div>
</div>
<div class="main">
<div class="page-header"><h1>Overview</h1><button class="btn">Export Report</button></div>
<div class="stats">
<div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">EGP 842K</div><div class="stat-change up">+12.5% vs last month</div></div>
<div class="stat-card"><div class="stat-label">Active Users</div><div class="stat-value">12,438</div><div class="stat-change up">+8.2% vs last month</div></div>
<div class="stat-card"><div class="stat-label">Orders</div><div class="stat-value">1,847</div><div class="stat-change down">-3.1% vs last month</div></div>
<div class="stat-card"><div class="stat-label">Conversion Rate</div><div class="stat-value">3.2%</div><div class="stat-change up">+0.4% vs last month</div></div>
</div>
<div class="charts">
<div class="chart-card"><div class="chart-title">Revenue by Month</div><div class="bar-chart"><div class="bar" style="height:60%"><span class="bar-label">Jan</span></div><div class="bar" style="height:75%"><span class="bar-label">Feb</span></div><div class="bar" style="height:50%"><span class="bar-label">Mar</span></div><div class="bar" style="height:90%"><span class="bar-label">Apr</span></div><div class="bar" style="height:65%"><span class="bar-label">May</span></div><div class="bar" style="height:85%"><span class="bar-label">Jun</span></div><div class="bar" style="height:95%"><span class="bar-label">Jul</span></div><div class="bar" style="height:70%"><span class="bar-label">Aug</span></div></div></div>
<div class="chart-card"><div class="chart-title">Traffic Sources</div><div class="donut"><div class="donut-chart"><div class="donut-center"><div class="num">100%</div><div class="lbl">Total Traffic</div></div></div></div><div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#f97316"></div>Organic Search — 45%</div><div class="legend-item"><div class="legend-dot" style="background:#0ea5e9"></div>Social Media — 30%</div><div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div>Direct — 25%</div></div></div>
</div>
<div class="chart-card"><div class="chart-title">Recent Orders</div><<table><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody><tr><td>#1001</td><td>Ahmed K.</td><td>EGP 1,299</td><td><span class="badge active">Completed</span></td></tr><tr><td>#1002</td><td>Sara M.</td><td>EGP 899</td><td><span class="badge pending">Pending</span></td></tr><tr><td>#1003</td><td>Omar F.</td><td>EGP 2,499</td><td><span class="badge active">Completed</span></td></tr><tr><td>#1004</td><td>Laila H.</td><td>EGP 599</td><td><span class="badge failed">Failed</span></td></tr><tr><td>#1005</td><td>Karim A.</td><td>EGP 1,799</td><td><span class="badge active">Completed</span></td></tr></tbody></table>
</div>
</div>
</body>
</html>`;
}

function generateLanding(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nova — Launch Your Dreams</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{color:#0f172a;line-height:1.6}
.hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#fff;padding:100px 24px;text-align:center;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:100px;background:linear-gradient(180deg,transparent,#f8fafc)}
.hero-badge{display:inline-block;background:rgba(249,115,22,0.15);color:#f97316;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:24px}
.hero h1{font-size:56px;font-weight:800;letter-spacing:-2px;margin-bottom:20px;max-width:800px;margin-left:auto;margin-right:auto}
.hero h1 span{color:#f97316}
.hero p{font-size:20px;color:#cbd5e1;max-width:600px;margin:0 auto 40px}
.cta-group{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-primary{background:#f97316;color:#fff;border:none;padding:16px 36px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:all .3s}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(249,115,22,0.4)}
.btn-secondary{background:transparent;color:#fff;border:2px solid #475569;padding:14px 34px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s}
.btn-secondary:hover{border-color:#f97316;color:#f97316}
.features{padding:100px 24px;max-width:1200px;margin:0 auto}
.section-title{text-align:center;font-size:36px;font-weight:800;margin-bottom:12px;letter-spacing:-1px}
.section-sub{text-align:center;color:#64748b;font-size:18px;margin-bottom:60px}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px}
.feature{text-align:center;padding:32px;border-radius:20px;transition:all .3s;cursor:default}
.feature:hover{background:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.feature-icon{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;background:linear-gradient(135deg,#fffbeb,#fef3c7)}
.feature h3{font-size:20px;font-weight:700;margin-bottom:8px}
.feature p{color:#64748b;font-size:15px}
.testimonials{background:#f8fafc;padding:100px 24px}
.testimonial-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;max-width:1000px;margin:0 auto}
.testimonial{background:#fff;padding:32px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.testimonial-text{font-size:16px;color:#334155;margin-bottom:20px;font-style:italic}
.testimonial-author{display:flex;align-items:center;gap:12px}
.author-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#f97316,#fdba74);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
.author-name{font-weight:600;font-size:15px}
.author-role{font-size:13px;color:#94a3b8}
.cta-section{padding:100px 24px;text-align:center;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff}
.cta-section h2{font-size:42px;font-weight:800;margin-bottom:16px;letter-spacing:-1px}
.cta-section p{font-size:18px;color:#cbd5e1;margin-bottom:40px}
.footer{background:#0f172a;color:#94a3b8;padding:40px 24px;text-align:center;font-size:14px}
@media(max-width:768px){.hero h1{font-size:32px}.section-title{font-size:28px}.cta-section h2{font-size:28px}}
</style>
</head>
<body>
<section class="hero">
<div class="hero-badge">New: AI-powered insights</div>
<h1>Launch your dreams with <span>Nova</span></h1>
<p>The all-in-one platform to build, ship, and scale your ideas faster than ever before.</p>
<div class="cta-group"><button class="btn-primary">Get Started Free</button><button class="btn-secondary">Watch Demo</button></div>
</section>
<section class="features">
<h2 class="section-title">Everything you need to succeed</h2>
<p class="section-sub">Powerful features designed to help you build and grow</p>
<div class="feature-grid">
<div class="feature"><div class="feature-icon">⚡</div><h3>Lightning Fast</h3><p>Deploy in seconds with our optimized global CDN and edge infrastructure.</p></div>
<div class="feature"><div class="feature-icon">🎨</div><h3>Beautiful Design</h3><p>Stunning templates and components that make your brand stand out.</p></div>
<div class="feature"><div class="feature-icon">🔒</div><h3>Secure by Default</h3><p>Enterprise-grade security with encryption, compliance, and monitoring built-in.</p></div>
<div class="feature"><div class="feature-icon">📊</div><h3>Smart Analytics</h3><p>Real-time insights and dashboards to track your growth and engagement.</p></div>
<div class="feature"><div class="feature-icon">🚀</div><h3>Auto-Scaling</h3><p>From zero to millions of users without lifting a finger. We handle the infra.</p></div>
<div class="feature"><div class="feature-icon">🤝</div><h3>24/7 Support</h3><p>Our team is always here to help you succeed, whenever you need us.</p></div>
</div>
</section>
<section class="testimonials">
<h2 class="section-title">Loved by founders</h2>
<p class="section-sub">Join thousands of teams building with Nova</p>
<div class="testimonial-grid">
<div class="testimonial"><p class="testimonial-text">"Nova transformed our entire workflow. We shipped our product in days instead of months."</p><div class="testimonial-author"><div class="author-avatar">AK</div><div><div class="author-name">Ahmed Khaled</div><div class="author-role">CEO, TechStart</div></div></div></div>
<div class="testimonial"><p class="testimonial-text">"The best investment we made. Our conversion rate doubled within the first month."</p><div class="testimonial-author"><div class="author-avatar">SM</div><div><div class="author-name">Sara Mohamed</div><div class="author-role">Founder, BloomShop</div></div></div></div>
<div class="testimonial"><p class="testimonial-text">"Incredible platform. The AI features alone saved us weeks of development time."</p><div class="testimonial-author"><div class="author-avatar">OF</div><div><div class="author-name">Omar Farouk</div><div class="author-role">CTO, DataFlow</div></div></div></div>
</div>
</section>
<section class="cta-section">
<h2>Ready to build something amazing?</h2>
<p>Start your free trial today. No credit card required.</p>
<button class="btn-primary">Get Started Now</button>
</section>
<footer class="footer">© 2026 Nova. All rights reserved. Built with passion.</footer>
</body>
</html>`;
}

function generateGeneric(prompt: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Generated App</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{background:#f8fafc;color:#0f172a;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:60px 24px;text-align:center}
.card{background:#fff;border-radius:20px;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-top:40px}
h1{font-size:36px;font-weight:800;margin-bottom:16px;letter-spacing:-1px}
h1 span{color:#f97316}
p{font-size:18px;color:#64748b;margin-bottom:24px}
.btn{background:#f97316;color:#fff;border:none;padding:14px 36px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;transition:all .3s}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(249,115,22,0.4)}
</style>
</head>
<body>
<div class="container">
<h1>Your <span>App</span> is Ready</h1>
<p>Generated from: "${prompt}"</p>
<div class="card"><p>This is a starting point. Use the prompt bar to iterate and add more details to refine your design.</p><button class="btn">Get Started</button></div>
</div>
</body>
</html>`;
}

export function generateCode(prompt: string, template?: Template): string {
  if (template && template.category !== 'blank') {
    switch (template.category) {
      case 'e-commerce': return generateEcommerce(prompt);
      case 'dashboard': return generateDashboard(prompt);
      case 'landing-page': return generateLanding(prompt);
    }
  }
  const category = detectCategory(prompt);
  switch (category) {
    case 'e-commerce': return generateEcommerce(prompt);
    case 'dashboard': return generateDashboard(prompt);
    default: return generateLanding(prompt);
  }
}

const STREAM_TOKENS = [
  'Analyzing your prompt',
  'Identifying components',
  'Selecting design system',
  'Generating HTML structure',
  'Applying styles',
  'Adding interactivity',
  'Optimizing layout',
  'Finalizing preview',
];

export async function streamGenerate(
  prompt: string,
  template: Template | undefined,
  callbacks: GenerationCallbacks
): Promise<string> {
  for (const status of STREAM_TOKENS) {
    callbacks.onStatus(status);
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 200));
  }
  const code = generateCode(prompt, template);
  callbacks.onStatus('Done');
  return code;
}
