#!/bin/bash

# Create a minimal public folder structure
cd /home/claude/modovisa-react

echo "🧹 Final cleanup - keeping only essentials..."

# Create clean public directory
mkdir -p public_clean/{img,fonts}

# Copy only essential images (branding and favicons)
cp -r public/img/branding public_clean/img/
cp -r public/img/favicon public_clean/img/
cp -r public/img/front-pages public_clean/img/ 2>/dev/null || true
cp -r public/img/docs public_clean/img/ 2>/dev/null || true

# Keep only needed icons
mkdir -p public_clean/img/icons
cp -r public/img/icons/stripe.svg public_clean/img/icons/ 2>/dev/null || true

# Copy only essential fonts (fontawesome for icons)
mkdir -p public_clean/fonts
cp -r public/vendor/fonts/fontawesome* public_clean/fonts/ 2>/dev/null || true
cp -r public/vendor/fonts/iconify-icons.css public_clean/fonts/ 2>/dev/null || true

# Add echarts from CDN instead of local
# Keep config.js only
mkdir -p public_clean/js
cat > public_clean/js/config.js << 'EOF'
// API Configuration
window.CONFIG = {
  API_BASE_URL: 'https://api.modovisa.com',
  APP_NAME: 'Modovisa',
  VERSION: '2.0.0'
};
EOF

# Remove old public and rename
rm -rf public
mv public_clean public

echo "✅ Cleaned public folder!"
du -sh public/

# Remove unnecessary development files
rm -rf .git 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo ""
echo "📦 Final project size:"
du -sh . | head -1
