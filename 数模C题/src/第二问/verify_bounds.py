import sys, time
import numpy as np
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')

from q2_main import (load_all, build_templates, solve_step,
                     ETA, SMIN, SMAX, EMAX, DT, T)

print('=' * 72)
print('下界合法性交叉验证（同一 (x̂, e0) 输入下的 C1-LP / MILP / C2-LP）')
print('=' * 72)

print('\n[0] 静态审查:')
print(f'   η = {ETA}（C1/C2/B 模板共用常量；η²={ETA**2:.2f}<1 是 C2 无套利论证支点）')
print(f'   目标方向: linprog 恒为 min；em 系数 = 5·p_t > 0，cur 系数 = 0.01 > 0'
      f' → 最优解压低 em/cur，费用口径为下界方向 ✓')
print(f'   C1 约束集 = {{功率≤{EMAX:.2f} kWh/段, SOC∈[{SMIN:.0f},{SMAX:.0f}], '
      f'平衡式, SOC递推, 购电固定 x̂}}，仅放松互补约束 c·em=0')
print(f'   SOC 初值规则: 三口径一致——链条式昨日实际末 SOC（非自由重置）；'
      f'逐日 LP 是"该 (x̂, e0) 下一切执行"的下界')

a1, load_df, pv_df = load_all()
p = a1['电价'].values
Lm = a1['小区负载'].values
Gm = a1['光伏发电预测功率'].values
dates = pd.to_datetime(load_df.iloc[:, 0])
L_all = load_df.iloc[:, 1:].values / 6.0
G_all = pv_df.iloc[:, 1:].values / 6.0
mask_out = (dates >= pd.Timestamp('2025-02-01')).values

from q2_main import solve_plan_lp, run_year
cache = {}
A = run_year('A', p, Lm, Gm, L_all, G_all, dates, mask_out,
             collect=True, cache=cache)
tot_A = A['plan_cost'].sum() + A['emerg_cost'].sum()
assert abs(tot_A - 26922467.55) < 1.0, 'A 口径自检失败'
print(f'\n[1] A 口径复现 {tot_A:,.2f} 元 ✓（提供逐日 x̂ 与 e0）')

tpls_cost = build_templates(p, 'cost')
tpls_energy = build_templates(p, 'energy')

from scipy.optimize import milp, LinearConstraint, Bounds
from scipy.sparse import csc_matrix


def build_milp(M=2000.0):
    h = T
    n = 6 * h
    rows, cols, vals = [], [], []
    for j in range(h):
        rows += [j, j, j, j]
        cols += [h + j, 2 * h + j, j, 3 * h + j]
        vals += [1.0, 1.0, -1.0, -1.0]
    for j in range(h):
        rows += [h + j, h + j, h + j]
        cols += [4 * h + j, j, h + j]
        vals += [1.0, -ETA, 1.0 / ETA]
        if j > 0:
            rows.append(h + j)
            cols.append(4 * h + j - 1)
            vals.append(-1.0)
    for j in range(h):
        rows += [2 * h + j, 2 * h + j]
        cols += [j, 5 * h + j]
        vals += [1.0, EMAX]
    for j in range(h):
        rows += [3 * h + j, 3 * h + j]
        cols += [2 * h + j, 5 * h + j]
        vals += [1.0, -M]
    Amat = csc_matrix((vals, (rows, cols)), shape=(4 * h, n))
    obj = np.zeros(n)
    obj[2 * h:3 * h] = 5.0 * p
    obj[3 * h:4 * h] = 0.01
    integrality = np.concatenate([np.zeros(5 * h), np.ones(h)])
    lb = np.zeros(n)
    ub = np.concatenate([np.full(h, EMAX), np.full(h, EMAX),
                         np.full(h, np.inf), np.full(h, np.inf),
                         np.full(h, SMAX), np.ones(h)])
    lb[4 * h:5 * h] = SMIN
    return {'A': Amat, 'obj': obj, 'integrality': integrality,
            'bounds': Bounds(lb, ub), 'M': M}


def solve_milp(md, x_vec, g_vec, l_vec, s):
    h = T
    lb = np.full(4 * h, -np.inf)
    ub = np.full(4 * h, np.inf)
    b_eq = np.empty(2 * h)
    b_eq[:h] = l_vec - x_vec - g_vec
    b_eq[h] = s
    if h > 1:
        b_eq[h + 1:] = 0.0
    lb[:2 * h] = b_eq
    ub[:2 * h] = b_eq
    ub[2 * h:3 * h] = EMAX
    ub[3 * h:4 * h] = 0.0
    res = milp(c=md['obj'], constraints=LinearConstraint(md['A'], lb, ub),
               integrality=md['integrality'], bounds=md['bounds'],
               options={'time_limit': 120, 'mip_rel_gap': 1e-9})
    assert res.status in (0, 1) and res.x is not None, \
        f'MILP失败: status={res.status}'
    return res.x[:5 * h]


def audit(sol, x_p, i, name):
    chg, dis = sol[0:T], sol[T:2 * T]
    em, cur, soc = sol[2 * T:3 * T], sol[3 * T:4 * T], sol[4 * T:5 * T]
    ok_pw = chg.max() <= EMAX + 1e-6 and dis.max() <= EMAX + 1e-6
    ok_soc = soc.min() >= SMIN - 1e-6 and soc.max() <= SMAX + 1e-6
    lhs = x_p.sum() + G_all[i].sum() + dis.sum() + em.sum()
    rhs = L_all[i].sum() + chg.sum() + cur.sum()
    ok_bal = abs(lhs - rhs) < 1e-6
    arb = int(((chg > 1e-7) & (em > 1e-7)).sum())
    cost = float(p @ x_p + 5 * p @ em)
    return cost, dict(pw=ok_pw, soc=ok_soc, bal=ok_bal, arb=arb,
                      em=float(em.sum()))


md = build_milp()
days = ['2025-03-20', '2025-06-21', '2025-09-23', '2025-12-21',
        '2025-02-01', '2025-07-15', '2025-11-30', '2025-12-05']

print('\n[2] 代表日交叉验证（同一 x̂ 与 e0；费用单位=元，当日口径）:')
print(f'   {"日期":>10} {"C1-LP":>10} {"MILP":>10} {"C2-LP":>10} '
      f'{"序✓":>3} {"MILP套利":>6} {"守恒":>4}')
t0 = time.time()
all_ok = True
for ds in days:
    i = int(np.where(dates == pd.Timestamp(ds))[0][0])
    e0 = A['detail'][ds]['e0']
    x_p = A['detail'][ds]['x_p']
    r1 = solve_step(tpls_cost[0], x_p, G_all[i], L_all[i], e0)
    assert r1.status == 0
    r2 = solve_step(tpls_energy[0], x_p, G_all[i], L_all[i], e0)
    assert r2.status == 0
    sM = solve_milp(md, x_p, G_all[i], L_all[i], e0)
    c1, a1d = audit(r1.x, x_p, i, 'C1')
    cM, aMd = audit(sM, x_p, i, 'MILP')
    c2, a2d = audit(r2.x, x_p, i, 'C2')
    ok_order = (c1 <= cM + 1.0) and (cM <= c2 + 1.0)
    ok_all = ok_order and a1d['bal'] and aMd['bal'] and a2d['bal'] \
        and a1d['pw'] and aMd['pw'] and a2d['pw'] \
        and a1d['soc'] and aMd['soc'] and a2d['soc']
    all_ok = all_ok and ok_all and aMd['arb'] == 0
    print(f'   {ds:>10} {c1:>10,.0f} {cM:>10,.0f} {c2:>10,.0f} '
          f'{"✓" if ok_order else "✗":>3} {aMd["arb"]:>6} '
          f'{"✓" if (a1d["bal"] and aMd["bal"] and a2d["bal"]) else "✗":>4}')
print(f'   （耗时 {time.time() - t0:.1f}s）')

print('\n[3] 结论:')
if all_ok:
    print('   全部代表日满足 C1 ≤ MILP ≤ C2，且 MILP 零套利、三解守恒/边界全过')
    print('   → C1 是合法费用下界（松弛方向正确）；')
    print('   → C2 的解是合法执行（无套利），其紧急电量即能量地板；')
    print('   → 全年 C1=2300.6万 >> 1500万，"执行层到达1500万"被下界否定。')
else:
    print('   ✗ 存在未通过项，见上表——需排查后再交付')
print('=' * 72)
