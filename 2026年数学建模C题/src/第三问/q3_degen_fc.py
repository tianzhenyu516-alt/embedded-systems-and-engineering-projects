import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, '..', '第二问'))
import q3_main as q3m

q3m.fc_144 = lambda hourly_24, h: q3m.a1['光伏发电预测功率'].values

st = q3m.run_year_q3((), 1.22, 1.00, tag='退化S0(常数均值日预报)')
REF = 19793691.58
tot = st['total']
ok = abs(tot - REF) < 1.0
print('=' * 72)
print(f'Q3 真退化检验: {tot:,.2f} vs Q2-B 封版 {REF:,.2f} '
      f'（差 {tot-REF:+.2f} 元）{"✓ 逐分复现" if ok else "✗ 超出 1 元，需排查"}')
print('=' * 72)
