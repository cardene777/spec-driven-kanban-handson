from pathlib import Path
import os,signal,sys
r=Path(__file__).resolve().parent.parent;a=sys.argv[1]
try:os.killpg(int((r/'.verification'/f'{a}-server.pid').read_text()),signal.SIGTERM)
except ProcessLookupError:pass
with (r/'evidence/session.md').open('a') as f:f.write(f'\nサーバー停止 `{a}`: 自分で起動したプロセスグループへSIGTERM、停止コマンド終了0（通常の停止）。初回promptサーバーはCtrl-C終了130。\n')
