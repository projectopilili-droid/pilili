#!/bin/sh
# Start the PILILÍ preview if it is not already healthy.
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace || exit 1
npm run dev > /tmp/pilili-dev.log 2>&1 &
exit 0
