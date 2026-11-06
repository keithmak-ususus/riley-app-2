#!/bin/sh
# Cache-busting for GitHub Pages (it lets browsers reuse files for 10 minutes, so a device can end up with
# a NEW index.html and an OLD app.js). Stamps ?v=<hash of the JS> onto the script tag and the module imports,
# so the page and its scripts always change together. Run it before committing anything that changes
# app.js, store.js, coach.js, photos.js or config.js. `--check` only verifies the stamp is current.
cd "$(dirname "$0")/.." || exit 1
v=$(cat app.js store.js coach.js photos.js config.js | sed -E 's/\?v=[A-Za-z0-9]+//g' | shasum | cut -c1-8)
if [ "$1" = "--check" ]; then
  n=$(grep -c "?v=$v" index.html app.js store.js | awk -F: '{s+=$2} END {print s}')
  [ "$n" = "6" ] && { echo "version stamp is current ($v)"; exit 0; }
  echo "version stamp is stale: run scripts/stamp-version.sh"; exit 1
fi
sed -i.bak -E "s#(src=\"app\.js)(\?v=[A-Za-z0-9]+)?\"#\1?v=$v\"#" index.html
sed -i.bak -E "s#(from \"\./(store|config|coach|photos)\.js)(\?v=[A-Za-z0-9]+)?\"#\1?v=$v\"#" app.js store.js
rm -f index.html.bak app.js.bak store.js.bak
echo "stamped $v"
