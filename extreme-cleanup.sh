#!/bin/bash

echo "🔥 Extreme cleanup - production essentials only..."

cd /home/claude/modovisa-react

# Keep only critical images
mkdir -p public_minimal/img/{branding,favicon}

# Essential branding only
cp public/img/branding/logo.svg public_minimal/img/branding/ 2>/dev/null || true
cp public/img/branding/logo.png public_minimal/img/branding/ 2>/dev/null || true
cp public/img/branding/logo-mv.svg public_minimal/img/branding/ 2>/dev/null || true

# Essential favicons only
cp public/img/favicon/favicon.ico public_minimal/img/favicon/ 2>/dev/null || true
cp public/img/favicon/favicon-16x16.png public_minimal/img/favicon/ 2>/dev/null || true
cp public/img/favicon/favicon-32x32.png public_minimal/img/favicon/ 2>/dev/null || true
cp public/img/favicon/apple-touch-icon.png public_minimal/img/favicon/ 2>/dev/null || true

# No vendor libraries - load from CDN instead
# No old JS files - everything in React now
# No old CSS - using Tailwind

rm -rf public
mv public_minimal public

# Create minimal config
cat > public/config.js << 'EOF'
window.CONFIG = {
  API_BASE_URL: 'https://api.modovisa.com'
};
EOF

echo "✅ Extreme cleanup done!"
du -sh public/

# Update index.html to load echarts from CDN
cat > index.html << 'EOFHTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/img/favicon/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Real-Time Visitor Tracking and Website Analytics | Modovisa</title>
    <meta name="description" content="Real-time visitor tracking and analytics services platform for any website owner. Track visitors, page journeys, conversions, and engagement as they happen - fast, privacy-friendly, and easy to use." />
    
    <!-- Load ECharts from CDN -->
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    
    <!-- Google Sign In -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    
    <!-- Stripe -->
    <script src="https://js.stripe.com/v3/"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOFHTML

echo ""
echo "📊 Final sizes:"
echo "Public folder: $(du -sh public | cut -f1)"
echo "Total project: $(du -sh . | cut -f1)"
echo ""
echo "✅ Production-ready and lean!"
