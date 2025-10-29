#!/bin/bash
echo "📁 Clean Project Structure:"
echo ""
echo "Source Code (src/):"
find src -type f -name "*.jsx" -o -name "*.js" -o -name "*.css" | wc -l
echo "  React component files"
echo ""
echo "Public Assets:"
du -sh public/
find public -type f | wc -l
echo "  essential files only"
echo ""
echo "Configuration:"
ls -1 *.js *.json 2>/dev/null | grep -v node_modules
echo ""
echo "Node Modules:"
du -sh node_modules/
echo ""
echo "Built Dist:"
if [ -d "dist" ]; then
  du -sh dist/
else
  echo "  (will be created on build)"
fi
echo ""
echo "Total Project Size:"
du -sh .
