#!/bin/bash
# 더블클릭하면 로컬 서버를 띄우고 브라우저를 엽니다.
# 채팅(Claude API)은 file:// 로 열면 브라우저가 차단할 수 있어서, 이 방식으로 여는 걸 권장합니다.
cd "$(dirname "$0")" || exit 1
PORT=8765
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "발리 일정 사이트를 http://localhost:$PORT 에서 엽니다."
echo "창을 닫으면 서버가 종료됩니다. (Ctrl+C 로도 종료)"
( sleep 1; open "http://localhost:$PORT/index.html" ) &
python3 -m http.server "$PORT" --bind 127.0.0.1
