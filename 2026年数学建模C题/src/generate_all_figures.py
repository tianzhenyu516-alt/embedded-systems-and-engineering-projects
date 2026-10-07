import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pickle, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '第二问'))
from q2_main import solve_plan_lp, execute_day_p0

sys.stdout.reconfigure(encoding='utf-8')

plt.rcParams.update({
    'font.family': 'SimHei', 'axes.unicode_minus': False,
    'font.size': 12, 'axes.labelsize': 13, 'axes.titlesize': 14,
    'legend.fontsize': 10, 'figure.dpi': 120, 'savefig.bbox': 'tight'
})

LINE_PROPS = [
    dict(color='black',  ls='-',  marker='o', lw=3.0),
    dict(color='#4a90d9', ls='--', marker='s', lw=2.5),
    dict(color='#c0392b', ls=':',  marker='^', lw=2.2),
    dict(color='#27ae60', ls='-.', marker='D', lw=2.2),
    dict(color='0.35',    ls='-',  marker='v', lw=2.5),
    dict(color='0.6',     ls='--', marker='p', lw=2.0),
    dict(color='black',   ls=':',  marker='*', lw=2.5),
    dict(color='#8e44ad', ls='-.', marker='h', lw=2.2),
]
BAR_HATCHES = ['', '//', '\\\\', '..', 'xx', 'oo', '++']
BAR_COLORS  = ['#c0392b', '#4a90d9', '#27ae60', '#8e44ad', '#f39c12', '#1abc9c', '0.45']
LW_MAIN, LW_SEC = 3.0, 2.2

def mk_ax(ax):
    ax.grid(True, alpha=0.2, linewidth=0.7); ax.tick_params(labelsize=11)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, '..', '附件')
DATA_OUT = os.path.join(BASE, '数据分析', 'output')
Q1_DIR = os.path.join(BASE, '第一问')
Q2_DIR = os.path.join(BASE, '第二问')
Q3_DIR = os.path.join(BASE, '第三问')
Q4_DIR = os.path.join(BASE, '第四问')
for d in [DATA_OUT, Q1_DIR, Q2_DIR, Q3_DIR, Q4_DIR]:
    os.makedirs(d, exist_ok=True)

def pl(base, name): return os.path.join(base, name)
def loadp(path):
    with open(path, 'rb') as f: return pickle.load(f)
def safe_load(path):
    return loadp(path) if os.path.exists(path) else None

print('加载数据...')
a1 = pd.read_excel(os.path.join(DATA, '附件1.xlsx'))
load_df = pd.read_excel(os.path.join(DATA, '附件2.xlsx'), sheet_name='小区负载')
pv_df  = pd.read_excel(os.path.join(DATA, '附件2.xlsx'), sheet_name='光伏发电实际功率')
a3 = pd.read_excel(os.path.join(DATA, '附件3.xlsx'))
a3['日期'] = a3['日期'].ffill()
a3['日期'] = pd.to_datetime(a3['日期'])
a4 = pd.read_excel(os.path.join(DATA, '附件4.xlsx'))

p_a1 = a1['电价'].values
Lm   = a1['小区负载'].values
Gm   = a1['光伏发电预测功率'].values
P4   = a4.iloc[:, 1:].values.astype(float)
x    = np.arange(1, 145) / 6.0
dates = pd.to_datetime(load_df.iloc[:, 0])
L_all = load_df.iloc[:, 1:].values / 6.0
G_all = pv_df.iloc[:, 1:].values / 6.0

Q2 = safe_load(pl(Q2_DIR, '_q2_B122.pkl'))
Q3 = safe_load(pl(Q3_DIR, '_q3v2_S1218_a1.22.pkl'))
Q4 = safe_load(pl(Q4_DIR, '_q4_B122.pkl'))

print('加载完成，开始生成图表...\n')

print('[数据分析]')

fig, ax = plt.subplots(figsize=(11, 4.2))
ax.fill_between(x, L_all.min(0), L_all.max(0), hatch='//', edgecolor='0.55',
                facecolor='#c0392b', alpha=0.15, linewidth=0.6, label='逐时段极差')
ax.fill_between(x, np.percentile(L_all,25,0), np.percentile(L_all,75,0),
                color='#4a90d9', alpha=0.25, label='P25-P75')
ax.plot(x, L_all.mean(0), color='black', ls='-', marker='o', markevery=12,
        markersize=4, lw=3.0, label='均值')
ax.set_xlabel('时刻 / h'); ax.set_ylabel('负载 / kW')
ax.set_title('负载数据画像'); ax.legend(); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'负载画像.png')); plt.close(); print('  ✓ 负载画像')

fig, ax = plt.subplots(figsize=(11, 4.2))
ax.fill_between(x, G_all.min(0), G_all.max(0), hatch='\\\\', edgecolor='0.55',
                facecolor='#27ae60', alpha=0.15, linewidth=0.6, label='逐时段极差')
ax.plot(x, G_all.mean(0), color='#27ae60', ls='--', marker='s', markevery=12,
        markersize=4, lw=2.5, label='均值')
ax.set_xlabel('时刻 / h'); ax.set_ylabel('光伏功率 / kW')
ax.set_title('光伏数据画像'); ax.legend(); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'光伏画像.png')); plt.close(); print('  ✓ 光伏画像')

fig, axes = plt.subplots(1, 2, figsize=(13, 4.5))
axes[0].plot(x, p_a1, color='black', ls='-', marker='o', markevery=12,
             markersize=4, lw=3.0, label='附件1 固定电价')
axes[0].set_title('固定电价曲线'); axes[0].set_xlabel('时刻 / h')
axes[0].set_ylabel('电价 / 元/kWh'); axes[0].legend(); mk_ax(axes[0])
im = axes[1].imshow(P4, aspect='auto', cmap='viridis', origin='lower')
axes[1].set_title('附件4 波动电价热力图')
axes[1].set_xlabel('时段'); axes[1].set_ylabel('日期')
plt.colorbar(im, ax=axes[1], label='元/kWh')
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'电价画像.png')); plt.close(); print('  ✓ 电价画像')

fig, ax1 = plt.subplots(figsize=(11, 5))
ax2 = ax1.twinx()
ax3 = ax1.twinx(); ax3.spines['right'].set_position(('axes', 1.12))
l1, = ax1.plot(x, Lm, color='black', ls='-', marker='o', markevery=12, markersize=5, lw=3.0, label='负载')
l2, = ax1.plot(x, Gm, color='#27ae60', ls='--', marker='s', markevery=12, markersize=5, lw=2.5, label='光伏')
l3, = ax2.plot(x, p_a1, color='#c0392b', ls=':', marker='^', markevery=12, markersize=5, lw=2.2, label='电价')
ax1.set_xlabel('时刻 / h'); ax1.set_ylabel('功率 / kW'); ax2.set_ylabel('电价 / 元/kWh')
ax1.set_title('典型日综合曲线（负载 + 光伏 + 电价）')
ax1.legend(handles=[l1,l2,l3], loc='upper left'); mk_ax(ax1)
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'典型日综合曲线.png')); plt.close(); print('  ✓ 典型日综合曲线')

fore0 = a3[a3['预报时刻']=='0:00'].reset_index(drop=True)
f6 = a3[a3['预报时刻']=='6:00'].reset_index(drop=True)
pv_act = pv_df.set_index(pv_df.columns[0])
act = pv_act.loc[fore0['日期']].reset_index(drop=True)
act_h = act.iloc[:, [h*6-1 for h in range(1,25)]].values
fore0_v = fore0[[f'预报{i}小时' for i in range(1,25)]].values
fore6_v = f6[[f'预报{i}小时' for i in range(1,25)]].values
err0 = fore0_v[:,11:17]-act_h[:,11:17]
err6 = fore6_v[:,5:11]-act_h[:,11:17]
mae0, mae6 = np.abs(err0).mean(), np.abs(err6).mean()
fig, ax = plt.subplots(figsize=(7, 4.5))
bp = ax.bar(['0:00 预报','6:00 预报'], [mae0, mae6],
            color=['#c0392b','#4a90d9'], edgecolor='black',
            hatch=['//','\\\\'], lw=2.0, width=0.45)
for b, v in zip(bp, [mae0, mae6]):
    ax.text(b.get_x()+b.get_width()/2, v+5, f'{v:.0f} kW',
            ha='center', va='bottom', fontweight='bold', fontsize=12)
ax.set_ylabel('MAE / kW'); ax.set_title('光伏预报误差对比（午后 12:00–17:00）')
ax.set_ylim(0, max(mae0,mae6)*1.25); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'预报误差对比.png')); plt.close(); print('  ✓ 预报误差对比')

wi = dates[dates.dt.month==12].index[0]
su = dates[dates.dt.month==6].index[0]
sh = dates[dates.dt.month==4].index[0]
fig, ax = plt.subplots(figsize=(11, 4.5))
ax.plot(x, L_all[wi], color='black',   ls='-',  marker='o', markevery=12, markersize=5, lw=3.0, label='12月 冬峰')
ax.plot(x, L_all[su], color='#4a90d9', ls='--', marker='s', markevery=12, markersize=5, lw=2.5, label='6月 夏谷')
ax.plot(x, L_all[sh], color='#c0392b', ls=':',  marker='^', markevery=12, markersize=5, lw=2.2, label='4月 肩季')
ax.set_xlabel('时刻 / h'); ax.set_ylabel('负载 / kW')
ax.set_title('三类日情景对比'); ax.legend(); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(DATA_OUT,'三类日情景.png')); plt.close(); print('  ✓ 三类日情景')

print('\n[第一问]')
res = solve_plan_lp(p_a1, Lm, Gm, dt=1/6, s0=6000.0, free_end=False)
x_q1, c_q1, d_q1 = res
DT_Q1 = 1.0 / 6.0
_, em_q1, ch_q1, di_q1, soc_q1, _ = execute_day_p0(
    x_q1, c_p=c_q1, d_p=d_q1, L_act=Lm * DT_Q1, G_act=Gm * DT_Q1, e0=6000.0)
fig, axes = plt.subplots(3, 1, figsize=(11, 9), sharex=True)
axes[0].fill_between(x, 0, x_q1, color='#c0392b', alpha=0.35, label='购电量 $x_t$')
axes[0].plot(x, Lm*DT_Q1, color='black', ls='-', marker='o', markevery=12, markersize=4, lw=LW_SEC, label='负载需求')
axes[0].set_ylabel('kWh / 时段'); axes[0].set_title('Q1 调度方案：均值日最优')
axes[0].legend(); mk_ax(axes[0])
axes[1].fill_between(x, 0, ch_q1, color='#27ae60', alpha=0.5, label='充电')
axes[1].fill_between(x, 0, -di_q1, color='#c0392b', alpha=0.5, label='放电')
axes[1].set_ylabel('kWh / 时段'); axes[1].set_title('储能充放电'); axes[1].legend(); mk_ax(axes[1])
axes[2].plot(x, soc_q1, color='black', ls='-', marker='o', markevery=24, markersize=5, lw=3.0, label='SOC')
axes[2].axhline(1200, color='0.5', ls=':', lw=1.2); axes[2].axhline(10800, color='0.5', ls='--', lw=1.2)
axes[2].set_ylabel('SOC / kWh'); axes[2].set_xlabel('时刻 / h'); axes[2].set_title('SOC 轨迹')
axes[2].legend(); mk_ax(axes[2])
plt.tight_layout(); fig.savefig(pl(Q1_DIR,'Q1调度方案.png')); plt.close(); print('  ✓ Q1调度方案')

fig, ax1 = plt.subplots(figsize=(11, 5))
ax2 = ax1.twinx()
ax1.fill_between(x, 0, ch_q1, color='#27ae60', alpha=0.4, hatch='//',
                 edgecolor='0.3', lw=0.5, label='\u5145\u7535 $c_t$')
ax1.fill_between(x, 0, -di_q1, color='#c0392b', alpha=0.4, hatch='\\\\\\\\',
                 edgecolor='0.3', lw=0.5, label='\u653e\u7535 $d_t$')
l1, = ax1.plot(x, p_a1, color='black', ls='-', marker='o', markevery=12,
               markersize=4, lw=3.0, label='\u7535\u4ef7')
ax1.set_xlabel('\u65f6\u523b / h'); ax1.set_ylabel('kWh / \u65f6\u6bb5')
ax2.plot(x, soc_q1, color='#4a90d9', ls='--', marker='s', markevery=24,
         markersize=5, lw=2.5, label='SOC')
ax2.set_ylabel('SOC / kWh')
ax1.set_title('Q1 \u7b56\u7565\uff1a\u50a8\u80fd\u5145\u653e\u7535\u7a97\u53e3\u4e0e\u7535\u4ef7\u3001SOC \u5173\u7cfb')
l1s, lb1 = ax1.get_legend_handles_labels()
l2s, lb2 = ax2.get_legend_handles_labels()
ax1.legend(l1s + l2s, lb1 + lb2, loc='lower left'); mk_ax(ax1)
plt.tight_layout(); fig.savefig(pl(Q1_DIR, 'Q1\u7b56\u7565\u4e0e\u7535\u4ef7.png'))
plt.close(); print('  \u2713 Q1\u7b56\u7565\u4e0e\u7535\u4ef7')

baseline = float(p_a1 @ np.maximum(Lm - Gm, 0) / 6); lp_cost = float(p_a1 @ x_q1); sv = baseline - lp_cost
fig, ax = plt.subplots(figsize=(6, 5))
bars = ax.bar(['无储能基线','LP 最优','节省额'],
              [baseline/1e4, lp_cost/1e4, sv/1e4],
              color=['#4a90d9','#c0392b','#27ae60'], edgecolor='black',
              hatch=['//','\\\\',''], lw=2.0, width=0.55)
for b, v in zip(bars,[baseline/1e4,lp_cost/1e4,sv/1e4]):
    ax.text(b.get_x()+b.get_width()/2, v+0.15, f'{v:,.2f}',
            ha='center', va='bottom', fontweight='bold', fontsize=11)
ax.set_ylim(0, max(baseline, lp_cost, sv)/1e4*1.18)
ax.set_ylabel('费用 / 万元'); ax.set_title(f'Q1 均值日：无储能 {baseline/1e4:.2f} 万 vs LP 最优 {lp_cost/1e4:.2f} 万（省 {sv/baseline*100:.1f}%）', pad=12); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(Q1_DIR,'Q1基线对比.png')); plt.close()
from PIL import Image
_img = Image.open(pl(Q1_DIR,'Q1基线对比.png'))
assert _img.height < 3000, f'Q1基线对比 渲染异常: {_img.size}'
print(f'  ✓ Q1基线对比（尺寸 {_img.size[0]}x{_img.size[1]}）')

print('\n[第二问]')
csvs = [pl(Q2_DIR,f) for f in ['Q2_scan_v2.csv','Q2_scan_v2edge.csv','Q2_scan_v2edge2.csv']]
rows = []
for c in csvs:
    if os.path.exists(c):
        d = pd.read_csv(c); d.columns = [c.lower().strip() for c in d.columns]
        rows.append(d)
scan = pd.concat(rows, ignore_index=True).drop_duplicates(subset=['alpha','beta'], keep='last')
scan['emerg_kwh'] = pd.to_numeric(scan['emerg_kwh'], errors='coerce')
scan = scan[scan['emerg_kwh'].notna()].reset_index(drop=True)

monthly_A = np.array([70.8, 35.7, 16.8, 4.4, 6.4, 33.0,
                       44.4, 28.6, 13.1, 15.7, 36.2, 72.4]) * 1e4
monthly_B = np.zeros(12)
for ds, d in Q2['detail'].items():
    monthly_B[pd.Timestamp(ds).month - 1] += d['emerg'].sum()

fig, ax = plt.subplots(figsize=(11, 5))
w = 0.27; months = np.arange(1, 13)
ax.bar(months - w, monthly_A / 1e4, w, color='#c0392b', edgecolor='black',
       hatch='//', lw=1.8, label='A·P0 对照（含 1 月预热）')
ax.bar(months, monthly_B / 1e4, w, color='#4a90d9', edgecolor='black',
       hatch='\\\\', lw=1.8, label='B·MPC 主交付（仅 2-12 月）')
ax.set_xlabel('月份'); ax.set_ylabel('紧急购电量 / 万 kWh')
ax.set_title('月度紧急购电分布（A vs B，1 月为预热段）')
ax.set_xticks(months); ax.legend(); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(Q2_DIR, 'Q2月度紧急购电.png'))
plt.close(); print('  ✓ Q2月度紧急购电')

C1_tot, C2_tot = 1932.7e4, 1944.6e4
fig, ax = plt.subplots(figsize=(8, 5.5))
labels = ['A·P0\n对照','B·MPC\n主交付','C1·绝对\n下界','C2·能量\n地板']
vals = [2692.2, (Q2['plan_cost'].sum()+Q2['emerg_cost'].sum())/1e4, C1_tot/1e4, C2_tot/1e4]
bc = ['#c0392b','#4a90d9','#27ae60','#8e44ad']
bh = ['//', '\\\\', '..', 'xx']
bars = ax.bar(labels, vals, color=bc, edgecolor='black', hatch=bh, lw=2.0, width=0.6)
for b, v in zip(bars, vals):
    ax.text(b.get_x()+b.get_width()/2, v+20, f'{v:,.0f}', ha='center', va='bottom', fontweight='bold', fontsize=11)
ax.set_ylabel('总费用 / 万元'); ax.set_title('四口径全年总费用对比'); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(Q2_DIR,'Q2三口径对比.png')); plt.close()
print('  ✓ Q2三口径对比')

fig, ax = plt.subplots(figsize=(8, 6))
sc = ax.scatter(scan['alpha'], scan['beta'], c=scan['total']/1e4, cmap='viridis_r',
                s=180, edgecolor='black', linewidth=1.5, zorder=3)
plt.colorbar(sc, ax=ax, label='总费用 / 万元')
best = scan.iloc[scan['total'].idxmin()]
ax.scatter([best['alpha']], [best['beta']], c='white', marker='*', s=400, edgecolor='black',
           linewidth=2, zorder=5, label=f"最优 ({best['alpha']:.2f},{best['beta']:.2f})")
ax.scatter([1.0], [1.0], c='0.4', marker='D', s=140, edgecolor='black', linewidth=1.5,
           zorder=4, label='基准 (1,1)')
for _, r in scan.iterrows():
    ax.annotate(f'{r["total"]/1e4:,.0f}', (r['alpha'],r['beta']), textcoords='offset points',
                xytext=(8,6), fontsize=9)
ax.set_xlabel('α（计划负载高估系数）'); ax.set_ylabel('β（计划光伏折扣系数）')
ax.set_title('α-β 保守计划灵敏度（B 口径）'); ax.legend(loc='lower left'); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(Q2_DIR,'Q2_alpha_beta扫描.png')); plt.close()
print('  ✓ Q2 alpha-beta 扫描')

fig, axes = plt.subplots(2, 2, figsize=(13, 7))
for col, (ds, nm) in enumerate([('2025-12-21','12-21 冬至'),('2025-06-21','6-21 夏至')]):
    d = Q2['detail'][ds]; xc = x
    axes[0,col].plot(xc, d['soc'], color='black', ls='-', marker='o', markevery=12,
                     markersize=4, lw=3.0)
    axes[0,col].axhline(1200, color='0.5', ls=':', lw=1.2)
    axes[0,col].axhline(10800, color='0.5', ls='--', lw=1.2)
    axes[0,col].set_ylabel('SOC / kWh'); axes[0,col].set_title(f'{nm}：SOC'); mk_ax(axes[0,col])
    axes[1,col].bar(xc, d['emerg'], width=1/6, color='#c0392b', edgecolor='black', hatch='//', lw=0.8)
    axes[1,col].set_ylabel('紧急购电 / kWh'); axes[1,col].set_xlabel('时刻 / h')
    axes[1,col].set_title(f'紧急购电（{d["emerg"].sum():.0f} kWh）'); mk_ax(axes[1,col])
plt.tight_layout(); fig.savefig(pl(Q2_DIR,'Q2案例对比.png')); plt.close()
print('  ✓ Q2案例对比')

print('\n[第三问]')
q3_results = {}
for st in ['S0','S6','S12','S18','S612','S1218','S61218']:
    p = pl(Q3_DIR, f'_q3v2_{st}_a1.22.pkl')
    if os.path.exists(p):
        with open(p,'rb') as f: q3_results[st] = pickle.load(f)

if q3_results:
    fig, ax = plt.subplots(figsize=(11, 5.5))
    keys = [k for k in ['S0','S6','S12','S18','S612','S1218','S61218'] if k in q3_results]
    pv_ = [q3_results[k]['plan']/1e4 for k in keys]
    dv_ = [q3_results[k]['dev']/1e4 for k in keys]
    ev_ = [q3_results[k]['emerg']/1e4 for k in keys]
    xp = np.arange(len(keys)); bw=0.55
    ax.bar(xp, pv_, bw, color='#4a90d9', edgecolor='black', hatch='//', lw=1.8, label='计划购电费')
    ax.bar(xp, dv_, bw, bottom=pv_, color='#f39c12', edgecolor='black', hatch='\\\\', lw=1.8, label='偏差费')
    ax.bar(xp, ev_, bw, bottom=np.array(pv_)+np.array(dv_), color='#c0392b', edgecolor='black',
           hatch='..', lw=1.8, label='紧急购电费')
    for k, key in enumerate(keys):
        tv = q3_results[key]['total']/1e4
        ax.text(xp[k], tv+15, f'{tv:,.0f}', ha='center', fontweight='bold', fontsize=10)
    ax.set_xticks(xp); ax.set_xticklabels(keys, fontsize=10); ax.set_ylabel('费用 / 万元')
    ax.set_title('Q3 七策略费用对比（α=1.22，固定电价）', pad=30)
    ax.legend(loc='lower left', bbox_to_anchor=(0, 1.02, 1, 0.2), ncol=3,
              mode='expand', borderaxespad=0); mk_ax(ax)
    plt.tight_layout(); fig.savefig(pl(Q3_DIR,'Q3策略对比.png')); plt.close()
    print('  ✓ Q3策略对比')

if Q3:
    ds='2025-12-21'; d=Q3['detail'][ds]; i21=int(np.where(dates==pd.Timestamp(ds))[0][0])
    fig, axes = plt.subplots(2, 2, figsize=(13, 7))
    _fc = a3[(a3['\u65e5\u671f'] == pd.Timestamp('2025-12-21')) & (a3['\u9884\u62a5\u65f6\u523b'] == '0:00')]
    _fc_h = np.array([_fc[f'\u9884\u62a5{k}\u5c0f\u65f6'].values[0] for k in range(1, 25)])
    _fc_10m = np.interp(x, np.concatenate([[0.0], np.arange(1, 25)]),
                         np.concatenate([[0.0], _fc_h]))
    axes[0,0].plot(x, _fc_10m, color='black', ls='-', marker='o', markevery=24,
                   markersize=5, lw=2.2, label='0:00\u9884\u62a5')
    axes[0,0].plot(x, G_all[i21]*6, color='#4a90d9', ls='--', marker='s', markevery=24, markersize=5, lw=2.2, label='实际光伏')
    axes[0,0].set_ylabel('kW'); axes[0,0].set_title('光伏：预报 vs 实际'); axes[0,0].legend(); mk_ax(axes[0,0])
    axes[0,1].plot(x, d['xhat'], color='black', ls='-', marker='o', markevery=12, markersize=4, lw=3.0, label='0:00计划')
    axes[0,1].plot(x, d['x_final'], color='#c0392b', ls='--', marker='s', markevery=12, markersize=4, lw=2.5, label='调整后')
    axes[0,1].set_ylabel('kWh/时段'); axes[0,1].set_title('购电计划 vs 调整'); axes[0,1].legend(); mk_ax(axes[0,1])
    axes[1,0].plot(x, d['soc'], color='black', ls='-', marker='o', markevery=24, markersize=5, lw=3.0)
    axes[1,0].axhline(1200, color='0.5', ls=':', lw=1.2); axes[1,0].axhline(10800, color='0.5', ls='--', lw=1.2)
    axes[1,0].set_ylabel('SOC/kWh'); axes[1,0].set_title('SOC 轨迹'); mk_ax(axes[1,0])
    axes[1,1].bar(x, d['emerg'], width=1/6, color='#c0392b', edgecolor='black', hatch='//', lw=0.8)
    axes[1,1].set_ylabel('紧急购电/kWh'); axes[1,1].set_xlabel('时刻/h')
    axes[1,1].set_title(f'紧急购电 ({d["emerg"].sum():.0f} kWh)'); mk_ax(axes[1,1])
    plt.tight_layout(); fig.savefig(pl(Q3_DIR,'Q3滚动修正示意.png')); plt.close()
    print('  ✓ Q3滚动修正示意')

fig, ax = plt.subplots(figsize=(11, 5))
chain = [('Q2-A\n基准', 2692.2), ('保守计划', 2081.6), ('MPC自由化', 1979.4),
         ('光伏预报', 1843.5), ('S1218调整', 1817.6)]
colors_c = ['#c0392b', '#4a90d9', '#27ae60', '#8e44ad', '#2c3e50']
hatch_c  = ['//', '\\\\', '..', 'xx', '']
for i in range(len(chain)):
    ax.bar(i, chain[i][1], color=colors_c[i], edgecolor='black', hatch=hatch_c[i],
           width=0.6, lw=1.8, zorder=3)
    if i > 0:
        ax.annotate('', xy=(i-0.32, chain[i][1]), xytext=(i-0.32, chain[i-1][1]),
                    arrowprops=dict(arrowstyle='->', color='black', lw=1.8))
        ax.text(i-0.40, (chain[i-1][1]+chain[i][1])/2, f'-{chain[i-1][1]-chain[i][1]:.0f}',
                fontsize=10, fontweight='bold', ha='right', va='center')
ax.set_xticks(range(len(chain)))
ax.set_xticklabels([c[0] for c in chain], fontsize=10)
ax.set_ylabel('总费用 / 万元')
ax.set_title('信息价值链：从均值日计划到最终交付（固定电价）')
ax.set_ylim(0, 3100); mk_ax(ax)
plt.tight_layout(); fig.savefig(pl(Q3_DIR,'Q3信息价值链.png')); plt.close()
print('  ✓ Q3信息价值链')

print('\n[第四问]')
if Q4 and Q2:
    B_tot = Q4['plan_cost'].sum()+Q4['emerg_cost'].sum()
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    labels = ['Q2-B\n固定','Q2-B\n波动','Q3-S1218\n固定','Q3-S1218\n波动']
    vals = [1979.4, B_tot/1e4, 1817.6, 1846.4]
    bc4 = ['#4a90d9','#c0392b','#27ae60','#8e44ad']
    bh4 = ['//', '\\\\', '..', 'xx']
    bars = axes[0].bar(labels, vals, color=bc4, edgecolor='black', hatch=bh4, lw=2.0, width=0.6)
    for b, v in zip(bars, vals):
        axes[0].text(b.get_x()+b.get_width()/2, v+15, f'{v:,.0f}',
                     ha='center', va='bottom', fontweight='bold', fontsize=10)
    axes[0].set_ylabel('总费用 / 万元'); axes[0].set_title('固定 vs 波动电价（交付口径）')
    axes[0].tick_params(labelsize=10); mk_ax(axes[0])
    i426 = int(np.where(dates==pd.Timestamp('2025-04-26'))[0][0])
    axes[1].plot(x, P4[i426], color='black', ls='-', marker='o', markevery=12, markersize=4, lw=3.0, label='电价(左轴)')
    axes[1].set_ylabel('电价 / 元/kWh'); axes[1].set_xlabel('时刻 / h')
    ax2 = axes[1].twinx()
    ax2.plot(x, Q4['detail']['2025-04-26']['soc'], color='#27ae60', ls='--', marker='s',
             markevery=24, markersize=5, lw=2.5, label='SOC(右轴)')
    ax2.set_ylabel('SOC / kWh')
    axes[1].set_title('2025-04-26 近零电价日')
    l1, lb1 = axes[1].get_legend_handles_labels()
    l2, lb2 = ax2.get_legend_handles_labels()
    axes[1].legend(l1+l2, lb1+lb2, fontsize=9, loc='center left',
                   bbox_to_anchor=(0.02, 0.42)); mk_ax(axes[1])
    plt.tight_layout(); fig.savefig(pl(Q4_DIR,'Q4分析.png')); plt.close()
    print('  ✓ Q4分析')

    fig, axes = plt.subplots(1, 2, figsize=(11, 5))
    for ai, (title, Q_ref, p_tot, e_tot) in enumerate([
        ('Q2·B口径', Q2,
         [Q2['plan_cost'].sum()/1e4, Q4['plan_cost'].sum()/1e4],
         [Q2['emerg_cost'].sum()/1e4, Q4['emerg_cost'].sum()/1e4]),
        ('Q3·S1218口径', Q3,
         [Q3['plan']/1e4, Q4['plan_cost'].sum()/1e4],
         [Q3['emerg']/1e4, Q4['emerg_cost'].sum()/1e4]),
    ]):
        ax = axes[ai]; xp = np.arange(2); bw = 0.4
        ax.bar(xp-bw/2, p_tot, bw, color='#4a90d9', edgecolor='black', hatch='//',
               lw=1.8, label='计划购电费')
        ax.bar(xp+bw/2, e_tot, bw, color='#c0392b', edgecolor='black', hatch='\\\\',
               lw=1.8, label='紧急购电费')
        ax.set_xticks(xp); ax.set_xticklabels(['固定','波动'], fontsize=10)
        ax.set_ylabel('费用 / 万元'); ax.set_title(title)
        ax.legend(fontsize=9); mk_ax(ax)
    plt.tight_layout(); fig.savefig(pl(Q4_DIR,'Q4电价效应分解.png')); plt.close()
    print('  ✓ Q4电价效应分解')

print('\n' + '='*60)
print('全部图表生成完成')
print('='*60)
