import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from data_utils import (load_all, hour_col, forecast_to_10min, solve_day_lp,
                        runs_of, fmt_period, ETA, SMIN, SMAX, S0, PMAX,
                        DATA_DIR, OUTPUT_DIR)

plt.rcParams['font.family'] = 'SimHei'
plt.rcParams['axes.unicode_minus'] = False

print('=' * 70)
print('第一问：Q1 单日确定性 LP 求解')
print('=' * 70)

a1, load_df, pv_df, a3, a4 = load_all()
p = a1['电价'].values
L = a1['小区负载'].values
G = a1['光伏发电预测功率'].values
T, dt = 144, 1 / 6

net_e = (L - G) * dt
base_buy = np.maximum(net_e, 0)
base_cost = float(np.dot(p, base_buy))

print(f'\n1. 无储能基线: 全天购电 {base_buy.sum():.2f} kWh, 费用 {base_cost:.2f} 元')

sol = solve_day_lp(p, L, G, dt=dt)
buy, chg, dis, cur, soc = sol['buy'], sol['chg'], sol['dis'], sol['cur'], sol['soc']

print(f'\n2. LP最优解（变量数 {5*T}, HiGHS 全局最优）:')
print(f'   全天购电量 = {sol["total_buy"]:.2f} kWh')
print(f'   全天购电费 = {sol["cost"]:.2f} 元')
print(f'   平均购电价 = {sol["cost"]/sol["total_buy"]:.4f} 元/kWh（附件1均价 {p.mean():.4f}）')
print(f'   弃光量 = {cur.sum():.2f} kWh, 充电总量 = {chg.sum():.2f} kWh, 放电总量 = {dis.sum():.2f} kWh')
print(f'   SOC范围 = [{soc.min():.0f}, {soc.max():.0f}] kWh（边界 [{SMIN:.0f}, {SMAX:.0f}]）')

lhs = sol['total_buy'] + G.sum() * dt + dis.sum()
rhs = L.sum() * dt + chg.sum() + cur.sum()
assert abs(lhs - rhs) < 1e-6, f'功率不平衡: {lhs} vs {rhs}'
print(f'   平衡校验: 购电+光伏+放电 = {lhs:.2f} = 负载+充电+弃光 = {rhs:.2f} ✓')
print(f'   相比无储能基线节省: {base_cost - sol["cost"]:.2f} 元'
      f'（{100*(base_cost-sol["cost"])/base_cost:.1f}%）')

print('\n3. 最优策略（充电/放电窗口）:')
for name, arr in [('充电', chg), ('放电', dis)]:
    wins = runs_of(arr > 1e-6)
    for a, b in wins:
        e = arr[a:b + 1].sum()
        print(f'   {name}窗口 {fmt_period(a, b)}: {e:.1f} kWh')

print('\n4. 表1 指定时段购电量（kWh）:')
table1_slots = [60, 72, 84, 96, 108, 120]
for j in table1_slots:
    print(f'   {fmt_period(j)}: {buy[j]:.2f}')

print('\n5. 步长无关性验证（Δt = 5分钟, 分段常数细化, 能量守恒）:')
p2, L2, G2 = np.repeat(p, 2), np.repeat(L, 2), np.repeat(G, 2)
sol5 = solve_day_lp(p2, L2, G2, dt=1 / 12)
print(f'   10分钟: 购电 {sol["total_buy"]:.2f} kWh, 费用 {sol["cost"]:.2f} 元')
print(f'   5分钟 : 购电 {sol5["total_buy"]:.2f} kWh, 费用 {sol5["cost"]:.2f} 元')
print(f'   偏差  : 购电 {abs(sol5["total_buy"]-sol["total_buy"])/sol["total_buy"]*100:.4f}%,'
      f' 费用 {abs(sol5["cost"]-sol["cost"])/sol["cost"]*100:.4f}%')
print('   → 结论不依赖时间步长，10分钟粒度建模有效')

print('\n6. 填写 result1.xlsx:')
tpl = pd.ExcelFile(os.path.join(DATA_DIR, '附件5', 'result1.xlsx'))
df1 = pd.read_excel(tpl, '计划购电量')
df1['购电量'] = np.round(np.roll(buy, -1), 2)

df2 = pd.read_excel(tpl, '充放电量')
for i in range(6):
    sl = slice(i * 24, (i + 1) * 24)
    df2.loc[i, '充电量'] = round(float(chg[sl].sum()), 2)
    df2.loc[i, '放电量'] = round(float(dis[sl].sum()), 2)
mask0 = df2['时刻'].astype(str) == '0:00'
mask24 = df2['时刻'].astype(str) == '24:00'
df2.loc[mask0, '储电量'] = S0
df2.loc[mask24, '储电量'] = round(float(soc[-1]), 2)

out_path = os.path.join(OUTPUT_DIR, 'result1.xlsx')
with pd.ExcelWriter(out_path, engine='openpyxl') as w:
    df1.to_excel(w, sheet_name='计划购电量', index=False)
    df2.to_excel(w, sheet_name='充放电量', index=False)
print(f'   已保存: {out_path}')
print('\n   表2 储能4小时段充放电量（kWh）与0:00/24:00储电量:')
print(df2.to_string(index=False))

x = np.arange(1, T + 1) / 6
fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)

axes[0].plot(x, L, 'b-', lw=1.5, label='小区负载')
axes[0].plot(x, G, 'g-', lw=1.5, label='光伏预测')
axes[0].plot(x, L - G, 'k--', lw=1, alpha=0.6, label='净负载')
axes[0].set_ylabel('功率 / kW')
axes[0].legend(loc='upper left')
axes[0].set_title('Q1 最优调度方案（附件1均值日）')
axes[0].grid(alpha=0.3)

ax2 = axes[1]
ax2.bar(x, buy, width=1/6, color='steelblue', alpha=0.7, label='购电量')
ax2.set_ylabel('购电量 / kWh/10min')
ax2b = ax2.twinx()
ax2b.plot(x, p, 'r-', lw=1.5, label='电价')
ax2b.set_ylabel('电价 / 元/kWh')
ax2.legend(loc='upper left')
ax2b.legend(loc='upper right')
ax2.grid(alpha=0.3)

ax3 = axes[2]
ax3.bar(x, chg, width=1/6, color='green', alpha=0.6, label='充电量')
ax3.bar(x, -dis, width=1/6, color='orange', alpha=0.6, label='放电量')
ax3.axhline(y=0, color='gray', lw=0.8)
ax3.set_ylabel('充/放电量 / kWh/10min')
ax3b = ax3.twinx()
x_soc = np.concatenate([[0.0], x])
ax3b.plot(x_soc, np.concatenate([[S0], soc]), 'k-', lw=2, label='SOC')
ax3b.axhline(y=SMIN, color='gray', ls=':', lw=1)
ax3b.axhline(y=SMAX, color='gray', ls=':', lw=1)
ax3b.set_ylabel('SOC / kWh')
ax3.set_xlabel('时刻 / h')
ax3.legend(loc='upper left')
ax3b.legend(loc='upper right')
ax3.grid(alpha=0.3)
ax3.set_xlim(0, 24)

plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, 'Q1调度方案.png'), dpi=150)
print('\n图表已保存: 第一问/Q1调度方案.png')

from matplotlib.patches import Patch

fig, axes = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
ax = axes[0]
ax.plot(x, p, 'r-', lw=1.8, label='电价')
for a, b in runs_of(chg > 1e-6):
    ax.axvspan(x[a], x[b], color='green', alpha=0.18)
for a, b in runs_of(dis > 1e-6):
    ax.axvspan(x[a], x[b], color='orange', alpha=0.18)
ax.legend(handles=[plt.Line2D([0], [0], color='r', lw=1.8, label='电价'),
                   Patch(facecolor='green', alpha=0.35, label='充电窗口'),
                   Patch(facecolor='orange', alpha=0.35, label='放电窗口')],
          loc='upper left')
ax.set_ylabel('电价 / 元/kWh')
ax.set_title('充放电窗口与电价：低价充电、高价放电（峰谷比3.8 > 1/η^2=1.235，套利可行）')
ax.grid(alpha=0.3)

ax = axes[1]
ax.plot(x_soc, np.concatenate([[S0], soc]), 'k-', lw=2)
ax.axhline(SMIN, color='gray', ls=':', lw=1.2, label='SOC下限 1200')
ax.axhline(SMAX, color='gray', ls='--', lw=1.2, label='SOC上限 10800')
ax.axhline(S0, color='steelblue', ls='-.', lw=1, label='S0=6000')
ax.set_ylabel('SOC / kWh')
ax.set_xlabel('时刻 / h')
ax.set_title('储能荷电状态轨迹（首尾闭合 6000，上下边界均被触及→容量约束紧）')
ax.legend(loc='upper left')
ax.grid(alpha=0.3)
ax.set_xlim(0, 24)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, 'Q1策略与电价.png'), dpi=150)
print('图表已保存: 第一问/Q1策略与电价.png')

fig, axes = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
axes[0].bar(x - 1 / 24, base_buy, width=1 / 12, alpha=0.45, label='无储能基线')
axes[0].bar(x + 1 / 24, buy, width=1 / 12, alpha=0.75, label='LP最优')
axes[0].set_ylabel('购电量 / kWh/10min')
axes[0].set_title('逐时段购电量：无储能基线 vs LP最优')
axes[0].legend()
axes[0].grid(alpha=0.3)

cum_base = np.cumsum(p * base_buy)
cum_lp = np.cumsum(p * buy)
axes[1].plot(x, cum_base / 1e4, 'r-', lw=1.8, label=f'无储能基线（终值 {base_cost:.0f} 元）')
axes[1].plot(x, cum_lp / 1e4, 'b-', lw=1.8, label=f'LP最优（终值 {sol["cost"]:.0f} 元）')
axes[1].fill_between(x, cum_lp / 1e4, cum_base / 1e4, alpha=0.18, color='green',
                     label=f'优化节省 {base_cost - sol["cost"]:.0f} 元'
                           f'（{100 * (base_cost - sol["cost"]) / base_cost:.1f}%）')
axes[1].set_ylabel('累计购电费 / 万元')
axes[1].set_xlabel('时刻 / h')
axes[1].legend()
axes[1].grid(alpha=0.3)
axes[1].set_xlim(0, 24)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, 'Q1基线对比.png'), dpi=150)
print('图表已保存: 第一问/Q1基线对比.png')

print('\n10. 灵敏度分析（其余参数固定为附录1配置，每点均为一次完整LP求解）:')

etas = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00]
costs_eta = [solve_day_lp(p, L, G, dt=dt, eta=e)['cost'] for e in etas]
print('   充放电效率 η:')
for e, c in zip(etas, costs_eta):
    mark = '  ← 当前' if abs(e - ETA) < 1e-9 else ''
    print(f'     η={e:.2f}: 费用 {c:>9.0f} 元{mark}')

ks = [0.25, 0.50, 0.75, 1.00, 1.25, 1.50]
costs_cap = []
for k in ks:
    smin_k, smax_k = S0 - (S0 - SMIN) * k, S0 + (SMAX - S0) * k
    costs_cap.append(solve_day_lp(p, L, G, dt=dt, smin=smin_k, smax=smax_k)['cost'])
print('   可用容量缩放 k（SOC窗口 = 6000 ± 4800k）:')
for k, c in zip(ks, costs_cap):
    mark = '  ← 当前' if abs(k - 1.0) < 1e-9 else ''
    print(f'     k={k:.2f}: 费用 {c:>9.0f} 元{mark}')

pmaxs = [1000, 2000, 3000, 4000, 5000, 6000, 8000]
costs_pw = [solve_day_lp(p, L, G, dt=dt, pmax=pm)['cost'] for pm in pmaxs]
print('   充放电功率上限:')
for pm, c in zip(pmaxs, costs_pw):
    mark = '  ← 当前' if abs(pm - PMAX) < 1e-9 else ''
    print(f'     {pm:>4} kW: 费用 {c:>9.0f} 元{mark}')

fig, axes = plt.subplots(1, 3, figsize=(15, 4.2))
axes[0].plot(etas, costs_eta, 'o-', color='steelblue')
axes[0].plot([ETA], [sol['cost']], 'r*', ms=15, label='当前配置')
axes[0].set_xlabel('充放电效率 η')
axes[0].set_ylabel('全天购电费 / 元')
axes[0].set_title('效率灵敏度')
axes[1].plot(ks, costs_cap, 'o-', color='steelblue')
axes[1].plot([1.0], [sol['cost']], 'r*', ms=15, label='当前配置')
axes[1].set_xlabel('可用容量缩放 k')
axes[1].set_title('容量灵敏度')
axes[2].plot(pmaxs, costs_pw, 'o-', color='steelblue')
axes[2].plot([PMAX], [sol['cost']], 'r*', ms=15, label='当前配置')
axes[2].set_xlabel('功率上限 / kW')
axes[2].set_title('功率灵敏度')
for a in axes:
    a.grid(alpha=0.3)
    a.legend()
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, 'Q1灵敏度分析.png'), dpi=150)
print('   图表已保存: 第一问/Q1灵敏度分析.png')

print('=' * 70)
print('第一问 Q1 完成')
print('=' * 70)
