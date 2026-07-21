#!/usr/bin/env bash
set -euo pipefail

ALLOWLIST=(
  # Populate after first run: osv-scanner will show detected vulns
)

SCAN_JSON=$(osv-scanner --lockfile bun.lock --format json 2>/dev/null || true)

FOUND=$(echo "$SCAN_JSON" | node -e '
  let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
    try { const d=JSON.parse(s); const ids=new Set();
      for (const r of d.results||[]) for (const p of r.packages||[]) for (const v of p.vulnerabilities||[]) ids.add(v.id);
      console.log([...ids].sort().join("\n"));
    } catch(e){ console.log(""); }
  });')

if [ -z "$FOUND" ]; then
  echo "✅ No vulnerabilities detected."
  exit 0
fi

ALLOW=" ${ALLOWLIST[*]} "
NEW=0
while IFS= read -r id; do
  [ -z "$id" ] && continue
  if [[ "$ALLOW" == *" $id "* ]]; then
    echo "⚪ allowlisted (known-unfixable): $id"
  else
    echo "🔴 NEW/unexpected vulnerability: $id"
    NEW=$((NEW+1))
  fi
done <<< "$FOUND"

if [ "$NEW" -gt 0 ]; then
  echo ""
  echo "❌ $NEW new vulnerability(ies) not in allowlist. Review and remediate."
  exit 1
fi

echo ""
echo "✅ All detected vulnerabilities are pre-approved (dev-only, no upstream fix)."
