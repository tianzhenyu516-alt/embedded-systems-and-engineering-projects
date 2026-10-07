"""Q4 单组合执行器（每进程限 2 个重跑，规避 HiGHS 长进程内存碎片化）
用法:
  python q4_run_one.py B 1.35 0.95 B 1.35 1.00        # 跑 Q2-B 组合
  python q4_run_one.py S1218 1.00 1.00 S1218 1.35 1.00 # 跑 Q3-S1218 组合
  python q4_run_one.py assemble                        # 从 pickle 汇总 CSV
  python q4_run_one.py analyze                         # 锚点+对比+近零日+价值链
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os
import sys
import time
import pickle
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE_DIR, '..', '第二问'))
sys.path.insert(0, os.path.join(BASE_DIR, '..', '第三问'))
import q2_main as q2m
import q3_main as q3m

plt.rcParams['font.family'] = 'SimHei'
plt.rcParams['axes.unicode_minus'] = False
T = 144
OUT = BASE_DIR
Q2_REF = 19793691.58
ANCHOR_A11 = 2844.1e4
FOUR_DAYS = ['2025-03-20', '2025-06-21', '2025-09-23', '2025-12-21']

a4 = q3m.a4
P4 = a4.iloc[:, 1:].values.astype(float)


def q2_run(mode, alpha, beta, collect=False, tag=''):
    return q2m.run_year(mode, q3m.p, q3m.Lm, q3m.a1['光伏发电预测功率'].values,
                        q3m.L_all, q3m.G_all, q3m.dates, q3m.mask_out,
                        alpha=alpha, beta=beta, collect=collect,
                        price_mat=P4, tag=tag)


def q3_run(rev_hours, alpha, beta, collect=False, tag=''):
    return q3m.run_year_q3(rev_hours, alpha, beta, collect=collect,
                           price_mat=P4, tag=tag)


def run_combo(kind, a, b):
    pkl = os.path.join(OUT, f'_q4_{kind}_a{a}_b{b}.pkl')
    if os.path.exists(pkl):
        print(f'   [{kind} α={a},β={b}] 载入已存结果', flush=True)
        return
    t0 = time.time()
    if kind == 'B':
        st = q2_run('B', a, b, tag=f'Q4-B α={a},β={b}')
    else:
        st = q3_run((12, 18), a, b, tag=f'Q4-S1218 α={a},β={b}')
    with open(pkl, 'wb') as f:
        pickle.dump(st, f)
    tot = st['total'] if kind == 'S1218' else \
        st['plan_cost'].sum() + st['emerg_cost'].sum()
    print(f'   [{kind} α={a},β={b}] {tot/1e4:,.1f} 万（{time.time()-t0:.0f}s，已存盘）',
          flush=True)


def assemble():
    gridB = [(1.00, 0.95), (1.00, 1.00), (1.10, 0.95), (1.10, 1.00),
             (1.22, 1.00), (1.35, 0.95), (1.35, 1.00)]
    gridQ3 = [(1.00, 1.00), (1.22, 1.00), (1.35, 1.00)]
    rowsB, rowsQ3 = [], []
    for a, b in gridB:
        with open(os.path.join(OUT, f'_q4_B_a{a}_b{b}.pkl'), 'rb') as f:
            st = pickle.load(f)
        rowsB.append((a, b, st['plan_cost'].sum() + st['emerg_cost'].sum(),
                      st['emerg_energy'].sum()))
    for a, b in gridQ3:
        with open(os.path.join(OUT, f'_q4_S1218_a{a}_b{b}.pkl'), 'rb') as f:
            st = pickle.load(f)
        rowsQ3.append((a, b, st['total'], st['em_energy']))
    pd.DataFrame(rowsB, columns=['alpha', 'beta', 'total', 'emerg_kWh']
                 ).to_csv(os.path.join(OUT, '_q4_scanB.csv'), index=False)
    pd.DataFrame(rowsQ3, columns=['alpha', 'beta', 'total', 'emerg_kWh']
                 ).to_csv(os.path.join(OUT, '_q4_scanQ3.csv'), index=False)
    print('Q2-B 波动电价扫描（万元）:')
    bestB = min(rowsB, key=lambda r: r[2])
    for a, b, tot, ek in sorted(rowsB, key=lambda r: r[2]):
        mark = ' ←最优' if (a, b) == (bestB[0], bestB[1]) else ''
        print(f'   α={a:.2f} β={b:.2f}: {tot/1e4:,.1f}'
              f'（紧急 {ek/1e4:.1f} 万kWh）{mark}')
    print(f'   最优: ({bestB[0]}, {bestB[1]}) → {bestB[2]/1e4:,.1f} 万')
    print('Q3-S1218 波动电价扫描（万元）:')
    bestQ3 = min(rowsQ3, key=lambda r: r[2])
    for a, b, tot, ek in sorted(rowsQ3, key=lambda r: r[2]):
        mark = ' ←最优' if (a, b) == (bestQ3[0], bestQ3[1]) else ''
        print(f'   α={a:.2f} β={b:.2f}: {tot/1e4:,.1f}'
              f'（紧急 {ek/1e4:.1f} 万kWh）{mark}')
    print(f'   最优: ({bestQ3[0]}, {bestQ3[1]}) → {bestQ3[2]/1e4:,.1f} 万')


def analyze():
    with open(os.path.join(OUT, '_q4_B122.pkl'), 'rb') as f:
        B = pickle.load(f)
    with open(os.path.join(OUT, '_q4_S1218.pkl'), 'rb') as f:
        S = pickle.load(f)
    totB4 = B['plan_cost'].sum() + B['emerg_cost'].sum()
    print('\n[锚点复现]')
    stA11 = q2_run('A', 1.0, 1.0)
    tA11 = stA11['plan_cost'].sum() + stA11['emerg_cost'].sum()
    print(f'   A(1,1) P4 = {tA11/1e4:,.1f} 万（教程锚点 2844.1）')
    stA122 = q2_run('A', 1.22, 1.00)
    tA122 = stA122['plan_cost'].sum() + stA122['emerg_cost'].sum()
    print(f'   A(1.22) P4 = {tA122/1e4:,.1f} 万（教程锚点 2121.8）')
    stLed = q2m.run_year('A', q3m.p, q3m.Lm,
                         q3m.a1['光伏发电预测功率'].values, q3m.L_all,
                         q3m.G_all, q3m.dates, q3m.mask_out, alpha=1.0,
                         beta=1.0, price_mat=np.tile(q3m.p, (365, 1)),
                         ledger_mat=P4)
    tLed = stLed['plan_cost'].sum() + stLed['emerg_cost'].sum()
    print(f'   均值日计划按P4结算 = {tLed/1e4:,.1f} 万（教程锚点 2872.3）')
    print(f'   → 日前价格信息价值 ≈ {(tLed-tA11)/1e4:,.1f} 万/年'
          f'（对照: 光伏预报信息价值 136 万/年）')

    print('\n[固定 vs 波动]（交付口径）:')
    print(f'   Q2-B(1.22,1.00): 固定 1,979.4 → 波动 {totB4/1e4:,.1f} 万'
          f'（计划 {B["plan_cost"].sum()/1e4:,.1f}，紧急 '
          f'{B["emerg_cost"].sum()/1e4:,.1f}，占比 '
          f'{B["emerg_cost"].sum()/totB4*100:.1f}%）')
    print(f'   Q3-S1218(1.22,1.00): 固定 1,817.6 → 波动 {S["total"]/1e4:,.1f} 万'
          f'（计划 {S["plan"]/1e4:,.1f}，偏差 {S["dev"]/1e4:,.1f}，'
          f'紧急 {S["emerg"]/1e4:,.1f}）')

    i426 = int(np.where(q3m.dates == pd.Timestamp('2025-04-26'))[0][0])
    ds = '2025-04-26'
    d = B['detail'][ds]
    md = slice(60, 84)
    chg_426 = float(d['chg'][md].sum())
    all_mid = float(np.mean([B['detail'][str(dd.date())]['chg'][md].sum()
                             for dd in q3m.out_dates]))
    print(f'\n[近零日 4-26] 当日最低电价 {P4[i426].min():.4f} 元；'
          f'10:00-14:00 充电 {chg_426:,.0f} kWh vs 全年均值 {all_mid:,.0f} kWh')

    print('\n[信息价值链·全文收尾]')
    print('   均值日计划(Q2·A基准 2692.2万)')
    print('     → +保守缓冲(P0, α=1.18/0.95)         省 610.6 万 → 2081.6')
    print('     → +执行自由化+系数迁移(B, 1.22/1.00)  省 102.2 万 → 1979.4')
    print('     → +0:00 光伏预报(Q3·S0)              省 135.9 万 → 1843.5')
    print('     → +12:00/18:00 调整(Q3·S1218)        省  25.9 万 → 1817.6')
    print(f'     → 换波动电价(Q4·交付口径)              {totB4/1e4-1979.4:+,.1f} 万 '
          f'→ {totB4/1e4:,.1f}（Q2-B）/ {S["total"]/1e4:,.1f}（Q3-S1218）')
    print(f'     → 日前价格信息价值(对照实验)            ~{(tLed-tA11)/1e4:,.1f} 万/年')

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    ax = axes[0]
    labels = ['Q2-B 固定', 'Q2-B 波动', 'Q3-S1218 固定', 'Q3-S1218 波动']
    vals = [1979.4, totB4 / 1e4, 1817.6, S['total'] / 1e4]
    bars = ax.bar(labels, vals, color=['gray', 'steelblue', 'lightgray',
                                       'seagreen'], alpha=0.9)
    for bb, v in zip(bars, vals):
        ax.text(bb.get_x() + bb.get_width() / 2, v, f'{v:,.0f}',
                ha='center', va='bottom', fontsize=10)
    ax.set_ylabel('总费用 / 万元')
    ax.set_title('固定电价 vs 波动电价（交付口径）')
    ax.tick_params(axis='x', labelsize=9)
    ax = axes[1]
    xx = np.arange(1, T + 1) / 6
    i426 = int(np.where(q3m.dates == pd.Timestamp('2025-04-26'))[0][0])
    ax.plot(xx, P4[i426], 'r-', lw=1.5, label='当日电价(左轴)')
    ax.set_ylabel('电价 / 元/kWh', color='r')
    ax.set_xlabel('时刻 / h')
    ax2 = ax.twinx()
    ax2.plot(xx, B['detail']['2025-04-26']['soc'], 'k-', lw=1.8, label='SOC(右轴)')
    ax2.set_ylabel('SOC / kWh', color='k')
    ax.set_title('2025-04-26 近零电价日：电价曲线 vs SOC')
    l1, lb1 = ax.get_legend_handles_labels()
    l2, lb2 = ax2.get_legend_handles_labels()
    ax.legend(l1 + l2, lb1 + lb2, fontsize=9)
    plt.tight_layout()
    fig.savefig(os.path.join(OUT, 'Q4分析.png'), dpi=150)
    print('\n图已保存: Q4分析.png')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)
    if args[0] == 'assemble':
        assemble()
    elif args[0] == 'analyze':
        analyze()
    elif args[0] == 'degen':
        st = q2m.run_year('B', q3m.p, q3m.Lm,
                          q3m.a1['光伏发电预测功率'].values, q3m.L_all,
                          q3m.G_all, q3m.dates, q3m.mask_out, alpha=1.22,
                          beta=1.00, price_mat=np.tile(q3m.p, (365, 1)))
        tot = st['plan_cost'].sum() + st['emerg_cost'].sum()
        ok = abs(tot - Q2_REF) < 1.0
        print(f'   退化自检（稀疏计划LP）: {tot:,.2f} vs {Q2_REF:,.2f} '
              f'{"✓" if ok else "✗"}')
    else:
        it = iter(args)
        for kind, a, b in zip(it, it, it):
            run_combo(kind, float(a), float(b))
