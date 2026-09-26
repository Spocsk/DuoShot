#!/usr/bin/env python3
"""Patch the pinned upstream template for bounded long Storage transfers and safe logs."""
from pathlib import Path
import sys

root = Path(sys.argv[1])
p = root / 'volumes/api/envoy/lds.template.yaml'
s = p.read_text()
old = 'cluster: storage\n                          prefix_rewrite: /\n                          timeout: 30s'
new = ('cluster: storage\n                          prefix_rewrite: /\n'
       '                          timeout: 0s\n'
       '                          idle_timeout: 120s\n'
       '                          max_stream_duration:\n'
       '                            max_stream_duration: 600s')
if old in s:
    assert s.count(old) == 1
    s = s.replace(old, new)
else:
    assert new in s, 'Unexpected upstream Storage route; review before patching'
# %PATH% excludes query parameters (signed object tokens / OAuth query data).
s = s.replace('%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%', '%PATH%')
# Referrers can also contain signed URLs. Keep method/path/status/timing only.
s = s.replace('%REQ(REFERER)%', '-')
s = s.replace('%RESPONSE_CODE% %BYTES_SENT%', '%RESPONSE_CODE% %BYTES_SENT% %DURATION% %RESPONSE_FLAGS%') if '%DURATION% %RESPONSE_FLAGS%' not in s else s
p.write_text(s)
print('Envoy Storage timeout and log settings prepared; restart api-gw to apply.')
