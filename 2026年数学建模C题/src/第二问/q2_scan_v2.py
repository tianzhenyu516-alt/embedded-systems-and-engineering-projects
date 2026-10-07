import sys, time
import numpy as np
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')

from q2_main import (load_all, build_templates, run_year, OUTPUT_DIR)

print('=' * 70)
print('α-β 扫描 v2（信息集自洽：执行层未来 = α·L̄, β·Ḡ）')
print('=' * 70)

a1, load_df, pv_df = load_all()
p = a1['电价'].values
Lm = a1['小区负载'].values
Gm = a1['光伏发电预测功率'].values
dates = pd.to_datetime(load_df.iloc[:, 0])
L_all = load_df.iloc[:, 1:].values / 6.0
G_all = pv_df.iloc[:, 1:].values / 6.0
mask_out = (dates >= pd.Timestamp('2025-02-01')).values
tpls = build_templates(p, 'cost')
cache = {}

rows = []
csv_path = OUTPUT_DIR + '\\Q2_scan_v2.csv'

t0 = time.time()
stA = run_year('A', p, Lm, Gm, L_all, G_all, dates, mask_out,
               alpha=1.18, beta=0.95, cache=cache, tpls=tpls,
               tag='锚点 A(1.18,0.95)')
totA = stA['plan_cost'].sum() + stA['emerg_cost'].sum()
print(f'      ({time.time() - t0:.0f}s；旧教程参考 2081.6 万，'
      f'差 {totA - 20816000:+,.0f} 元)', flush=True)
rows.append((1.18, 0.95, totA, stA['emerg_energy'].sum(), 'A'))
pd.DataFrame(rows, columns=['alpha', 'beta', 'total', 'emerg_kwh', 'mode']
             ).to_csv(csv_path, index=False)

combos = [(1.00, 1.00), (1.10, 1.00), (1.15, 0.90), (1.15, 0.95),
          (1.15, 1.00), (1.18, 0.90), (1.18, 0.95), (1.18, 1.00),
          (1.20, 0.95), (1.20, 1.00)]
for a, b in combos:
    t0 = time.time()
    st = run_year('B', p, Lm, Gm, L_all, G_all, dates, mask_out,
                  alpha=a, beta=b, cache=cache, tpls=tpls,
                  tag=f'v2 α={a:.2f},β={b:.2f}')
    tot = st['plan_cost'].sum() + st['emerg_cost'].sum()
    rows.append((a, b, tot, st['emerg_energy'].sum(), 'B'))
    pd.DataFrame(rows, columns=['alpha', 'beta', 'total', 'emerg_kwh', 'mode']
                 ).to_csv(csv_path, index=False)
    print(f'      ({time.time() - t0:.0f}s，已存盘 {csv_path})', flush=True)

print('\n   v2 汇总（升序）:')
df = pd.DataFrame(rows, columns=['alpha', 'beta', 'total', 'emerg_kwh', 'mode'])
for _, r in df.sort_values('total').iterrows():
    print(f'   [{r["mode"]}] α={r["alpha"]:.2f} β={r["beta"]:.2f}: '
          f'{r["total"]/1e4:,.1f} 万（紧急 {r["emerg_kwh"]/1e4:.1f} 万kWh）')
print('=' * 70)
print('v2 扫描完成')
print('=' * 70)
