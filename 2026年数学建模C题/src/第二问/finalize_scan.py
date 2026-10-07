import sys
import glob
import os
import numpy as np
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'SimHei'
plt.rcParams['axes.unicode_minus'] = False
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

dfs = []
for f in sorted(glob.glob(os.path.join(OUTPUT_DIR, 'Q2_scan_v2*.csv'))):
    d = pd.read_csv(f)
    d.columns = [c.strip().lower() for c in d.columns]
    dfs.append(d)
df = pd.concat(dfs, ignore_index=True).drop_duplicates(
    subset=['alpha', 'beta', 'mode'], keep='last')
df['mode'] = df['mode'].fillna('B')

dfB = df[df['mode'] == 'B'].sort_values('total').reset_index(drop=True)
dfA = df[df['mode'] != 'B']

print('=' * 70)
print('B口径 α-β 扫描 v2 汇总（信息集自洽；总费用升序）')
print('=' * 70)
print(f'   {"α":>6} {"β":>6} {"总费用(万)":>12} {"紧急量(万kWh)":>14}')
for _, r in dfB.iterrows():
    print(f'   {r["alpha"]:>6.2f} {r["beta"]:>6.2f} {r["total"]/1e4:>12,.1f} '
          f'{r["emerg_kwh"]/1e4:>14,.1f}')
for _, r in dfA.iterrows():
    print(f'   [对照A] α={r["alpha"]:.2f} β={r["beta"]:.2f} '
          f'{r["total"]/1e4:>10,.1f} {r["emerg_kwh"]/1e4:>14,.1f}')

best = dfB.iloc[0]
base = dfB[(dfB['alpha'] == 1.00) & (dfB['beta'] == 1.00)].iloc[0]
plateau = dfB[dfB['total'] <= best['total'] * 1.01]
print(f'\n   最优: α={best["alpha"]:.2f}, β={best["beta"]:.2f} → '
      f'{best["total"]:,.0f} 元')
print(f'   基准 B(1,1): {base["total"]:,.0f} 元 → 保守计划红利 '
      f'{(base["total"]-best["total"])/1e4:,.1f} 万元'
      f'（P0 口径红利 610 万）')
print(f'   平台区（≤最优+1%）: {len(plateau)} 组 → ' +
      '、'.join(f'({r.alpha:.2f},{r.beta:.2f})' for _, r in plateau.iterrows()))

fig, ax = plt.subplots(figsize=(7.5, 5.5))
sc = ax.scatter(dfB['alpha'], dfB['beta'], c=dfB['total'] / 1e4,
                cmap='viridis_r', s=150, edgecolor='k')
plt.colorbar(sc, ax=ax, label='总费用 / 万元')
ax.scatter([best['alpha']], [best['beta']], c='red', marker='*', s=320,
           zorder=5, label=f"最优 ({best['alpha']:.2f}, {best['beta']:.2f})")
ax.scatter([1.0], [1.0], c='red', marker='X', s=140, label='基准 B(1,1)')
if len(dfA):
    ax.scatter(dfA['alpha'], dfA['beta'], c='blue', marker='D', s=140,
               zorder=5, label='A·P0 保守计划最优（对照）')
for _, r in dfB.iterrows():
    ax.annotate(f"{r['total']/1e4:,.0f}", (r['alpha'], r['beta']),
                textcoords='offset points', xytext=(7, 6), fontsize=8)
ax.set_xlabel('α（计划负载高估系数）')
ax.set_ylabel('β（计划光伏折扣系数）')
ax.set_title('B口径（MPC-fair·信息集自洽）下的保守计划灵敏度')
ax.legend()
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, 'Q2_alpha_beta扫描.png'), dpi=150)
print('\n   图已更新: Q2_alpha_beta扫描.png')
print('=' * 70)
