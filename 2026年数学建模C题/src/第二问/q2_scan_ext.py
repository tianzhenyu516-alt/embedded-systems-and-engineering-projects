import sys, time
import numpy as np
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')

from q2_main import (load_all, build_templates, run_year, OUTPUT_DIR)

print('=' * 70)
print('α-β 扫描 v2 谷底括点：α∈{1.25,1.28}（B·MPC-fair）')
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
csv_path = OUTPUT_DIR + '\\Q2_scan_v2edge2.csv'
for a, b in [(1.25, 1.00), (1.28, 1.00)]:
    t0 = time.time()
    st = run_year('B', p, Lm, Gm, L_all, G_all, dates, mask_out,
                  alpha=a, beta=b, cache=cache, tpls=tpls,
                  tag=f'fine α={a:.2f},β={b:.2f}')
    tot = st['plan_cost'].sum() + st['emerg_cost'].sum()
    rows.append((a, b, tot, st['emerg_energy'].sum()))
    pd.DataFrame(rows, columns=['alpha', 'beta', 'total', 'emerg_kWh']
                 ).to_csv(csv_path, index=False)
    print(f'      ({time.time() - t0:.0f}s，已存盘 {csv_path})', flush=True)
print('=' * 70)
print('加密扫描完成')
print('=' * 70)
