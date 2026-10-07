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
from q2_main import build_templates, solve_step
from data_utils import (load_all, solve_day_lp, solve_revised_lp,
                        fc_144, merge_emergency,
                        ETA, SMIN, SMAX, S0, PMAX, OUTPUT_DIR)

plt.rcParams['font.family'] = 'SimHei'
plt.rcParams['axes.unicode_minus'] = False

T = 144
DT = 1.0 / 6.0
EMAX = PMAX * DT

STRATEGIES = {'S0': (), 'S6': (6,), 'S12': (12,), 'S18': (18,),
              'S612': (6, 12), 'S1218': (12, 18), 'S61218': (6, 12, 18)}
ALPHA_BETAS = [(1.00, 1.00), (1.22, 1.00)]
FOUR_DAYS = ['2025-03-20', '2025-06-21', '2025-09-23', '2025-12-21']

print('=' * 72)
print('第三问：光伏预报滚动修正（四策略 × 两保守性设定）')
print('=' * 72)

a1, load_df, pv_df, a3, a4 = load_all()
p = a1['电价'].values
Lm = a1['小区负载'].values
dates = pd.to_datetime(load_df.iloc[:, 0])
L_all = load_df.iloc[:, 1:].values / 6.0
G_all = pv_df.iloc[:, 1:].values / 6.0
mask_out = (dates >= pd.Timestamp('2025-02-01')).values
idx_out = np.where(mask_out)[0]
out_dates = dates.iloc[idx_out]

fc = {}
for _, r in a3.iterrows():
    fc[(r['日期'], str(r['预报时刻']))] = np.array(
        [r[f'预报{k}小时'] for k in range(1, 25)], dtype=float)
print(f'\n1. 数据: {len(dates)}天, 正式统计 {int(mask_out.sum())} 天, '
      f'预报 {len(fc)} 条（365天×4时刻）')

tpls = build_templates(p, 'cost')
print(f'   执行层LP模板: 144 个（复用Q2 B口径）')

_pp = 0.8
_c1 = _pp * 50 + 0.5 * _pp * abs(50 - 100)
_c2 = _pp * 150 + 0.5 * _pp * abs(150 - 100)
assert abs(_c1 - 75 * _pp) < 1e-9 and abs(_c2 - 175 * _pp) < 1e-9
print('   结算公式自检: 100→50 = 75p ✓ ; 100→150 = 175p ✓'
      '（台账 = p·x_final + 0.5·p·|x_final−x̂|，非旧版 p·x̂）')

def run_day_q3(i, rev_hours, alpha, beta, e0, plan_cache, collect=False,
               p_day=None, tpls_day=None, p_led=None):
    if p_day is None:
        p_day = p
    if p_led is None:
        p_led = p_day
    if tpls_day is None:
        tpls_day = tpls
    d_i = dates.iloc[i]
    key = (str(d_i.date()), round(e0, 4), alpha, beta)
    if key not in plan_cache:
        pv0 = fc_144(fc[(d_i, '0:00')], 0)
        plan_cache[key] = solve_day_lp(p_day, Lm * alpha, pv0 * beta,
                                       dt=DT, s0=e0, free_end=True)
    xhat = plan_cache[key]['buy'].copy()
    x_eff = xhat.copy()

    releases = [(0, fc_144(fc[(d_i, '0:00')], 0) * beta * DT)]
    rev_set = {h * 6 for h in rev_hours}

    Lfut = Lm * alpha * DT
    s = e0
    emerg = np.zeros(T); chg = np.zeros(T); dis = np.zeros(T)
    soc = np.zeros(T); cur = np.zeros(T)
    n_branch = 0
    for t in range(T):
        if t in rev_set:
            h = t // 6
            pv_h = fc_144(fc[(d_i, f'{h}:00')], h)
            rev = solve_revised_lp(p_day[t:], pv_h[t:] * beta,
                                   Lm[t:] * alpha, xhat[t:], s)
            x_eff[t:] = rev['x']
            releases.append((t, pv_h * beta * DT))
        g_fut = releases[-1][1]
        h = T - t
        l_vec = np.empty(h); g_vec = np.empty(h)
        l_vec[0] = L_all[i, t]
        g_vec[0] = G_all[i, t]
        if h > 1:
            l_vec[1:] = Lfut[t + 1:]
            g_vec[1:] = g_fut[t + 1:]
        res = solve_step(tpls_day[t], x_eff[t:], g_vec, l_vec, s)
        assert res.status == 0, f'执行LP失败 day{i} t{t}: {res.message}'
        sol = res.x
        c0, em0 = sol[0], sol[2 * h]
        if c0 > 1e-9 and em0 > 1e-9:
            n_branch += 1
            ra = solve_step(tpls_day[t], x_eff[t:], g_vec, l_vec, s, fix_idx=0)
            rb = solve_step(tpls_day[t], x_eff[t:], g_vec, l_vec, s, fix_idx=2 * h)
            cands = [r for r in (ra, rb) if r.status == 0]
            sol = min(cands, key=lambda r: r.fun).x
            c0, em0 = sol[0], sol[2 * h]
        d0, cu0 = sol[h], sol[3 * h]
        s = s + ETA * c0 - d0 / ETA
        if SMIN - 1e-6 < s < SMIN:
            s = SMIN
        elif SMAX < s < SMAX + 1e-6:
            s = SMAX
        emerg[t], chg[t], dis[t], soc[t], cur[t] = em0, c0, d0, s, cu0

    plan_fee = float(p_led @ x_eff)
    dev_fee = float(0.5 * p_led @ np.abs(x_eff - xhat))
    em_fee = float(5 * p_led @ emerg)
    det = None
    if collect:
        det = {'xhat': xhat, 'x_final': x_eff.copy(), 'chg': chg, 'dis': dis,
               'soc': soc, 'emerg': emerg, 'cur': cur, 'e0': e0,
               'xhat_fee': float(p_led @ xhat), 'plan_fee': plan_fee,
               'dev_fee': dev_fee, 'emerg_fee': em_fee}
    return s, (plan_fee, dev_fee, em_fee, float(emerg.sum())), det, n_branch


def run_year_q3(rev_hours, alpha, beta, ndays=365, collect=False, tag='',
                price_mat=None, ledger_mat=None):
    if price_mat is None:
        price_mat = np.tile(p, (ndays, 1))
    if ledger_mat is None:
        ledger_mat = price_mat
    fixed_price = bool(np.allclose(price_mat, price_mat[0]))
    plan_cache = {}
    e0 = S0
    n_branch = 0
    fee = np.zeros(3)
    em_energy = 0.0
    days_emerg = 0
    monthly = np.zeros(12)
    detail = {}
    for i in range(ndays):
        p_day = price_mat[i] if not fixed_price else p
        p_led = ledger_mat[i] if not fixed_price else p
        tpls_day = None if fixed_price else build_templates(p_day, 'cost')
        d_i = dates.iloc[i]
        e0, fees, det, nb = run_day_q3(i, rev_hours, alpha, beta, e0,
                                       plan_cache, collect=collect,
                                       p_day=p_day, tpls_day=tpls_day,
                                       p_led=p_led)
        n_branch += nb
        monthly[d_i.month - 1] += fees[3]
        if mask_out[i]:
            fee += fees[:3]
            em_energy += fees[3]
            days_emerg += int(fees[3] > 1e-9)
            if collect:
                detail[str(d_i.date())] = det
    tot = {'plan': fee[0], 'dev': fee[1], 'emerg': fee[2],
           'total': float(fee.sum()), 'em_energy': em_energy,
           'days_emerg': days_emerg, 'monthly': monthly,
           'n_branch': n_branch, 'detail': detail}
    if tag:
        print(f'   [{tag}] 计划 {fee[0]/1e4:,.1f} + 偏差 {fee[1]/1e4:,.1f} '
              f'+ 紧急 {fee[2]/1e4:,.1f} = {fee.sum()/1e4:,.1f} 万'
              f'（紧急 {em_energy/1e4:.1f}万kWh, {days_emerg}天, '
              f'分支{n_branch}次）', flush=True)
    return tot

if len(sys.argv) > 1 and sys.argv[1] == 'test':
    print('\n[冒烟测试] S0·naive 前35天:')
    t0 = time.time()
    st = run_year_q3((), 1.0, 1.0, ndays=35, tag='S0@35d')
    print(f'   耗时 {time.time()-t0:.1f}s（35天）→ 全量预估 '
          f'{(time.time()-t0)/35*365/60:.1f} 分钟/策略')
    sys.exit(0)

def main():
    print('\n2. 全量对比（4策略 × 2保守性设定，334天统计）:')
    results = {}
    for alpha, beta in ALPHA_BETAS:
        for key, rev in STRATEGIES.items():
            tag = f'{key} α={alpha}'
            pkl = os.path.join(OUTPUT_DIR, f'_q3v2_{key}_a{alpha}.pkl')
            if os.path.exists(pkl):
                with open(pkl, 'rb') as f:
                    results[tag] = pickle.load(f)
                print(f'   [{tag}] 载入已存结果: 总 {results[tag]["total"]/1e4:,.1f} 万')
            else:
                t0 = time.time()
                results[tag] = run_year_q3(rev, alpha, beta, collect=True, tag=tag)
                with open(pkl, 'wb') as f:
                    pickle.dump(results[tag], f)
                print(f'      ({time.time()-t0:.0f}s，已存盘)', flush=True)

    print('\n3. 策略汇总（万元）:')
    print(f'   {"设定":>10} {"策略":>8} {"计划费":>9} {"偏差费":>8} {"紧急费":>9} '
          f'{"总费用":>9} {"紧急量万kWh":>11} {"紧急天数":>7}')
    for alpha, beta in ALPHA_BETAS:
        for key in STRATEGIES:
            r = results[f'{key} α={alpha}']
            print(f'   α={alpha:<6.2f} {key:>8} {r["plan"]/1e4:>9,.1f} '
                  f'{r["dev"]/1e4:>8,.1f} {r["emerg"]/1e4:>9,.1f} '
                  f'{r["total"]/1e4:>9,.1f} {r["em_energy"]/1e4:>11,.1f} '
                  f'{r["days_emerg"]:>7}')

    best_tag = min(results, key=lambda k: results[k]['total'])
    print(f'\n   全局最优: {best_tag} → {results[best_tag]["total"]/1e4:,.1f} 万')
    for alpha, beta in ALPHA_BETAS:
        s0 = results[f'S0 α={alpha}']['total']
        line = '   α=%.2f: ' % alpha + '  '.join(
            f'{k} {results[f"{k} α={alpha}"]["total"]/1e4:,.1f}'
            for k in STRATEGIES)
        s612 = results[f'S612 α={alpha}']['total']
        s61218 = results[f'S61218 α={alpha}']['total']
        line += f'   | 18点增量 {abs(s61218-s612)/1e4:.2f}万'
        print(line)
        print(f'        引入调整收益(最优-S0): '
              f'{(s0 - min(results[f"{k} α={alpha}"]["total"] for k in STRATEGIES))/1e4:,.1f} 万')

    print('\n4. 验证清单:')
    bd = results[best_tag]['detail']
    all_soc = np.concatenate([bd[str(d.date())]['soc'] for d in out_dates])
    print(f'   SOC范围 = [{all_soc.min():.2f}, {all_soc.max():.2f}] '
          f'{"✓" if all_soc.min() >= SMIN-1e-4 and all_soc.max() <= SMAX+1e-4 else "✗"}')
    d21 = bd['2025-12-21']
    i21 = int(np.where(dates == pd.Timestamp('2025-12-21'))[0][0])
    lhs = d21['x_final'].sum() + G_all[i21].sum() + d21['dis'].sum() + d21['emerg'].sum()
    rhs = L_all[i21].sum() + d21['chg'].sum() + d21['cur'].sum()
    print(f'   能量守恒(12-21): {lhs:.4f} vs {rhs:.4f} {"✓" if abs(lhs-rhs) < 1e-6 else "✗"}')
    ok_pre = all(np.allclose(bd[str(d.date())]['x_final'][:36],
                             bd[str(d.date())]['xhat'][:36]) for d in out_dates)
    print(f'   调整不触及6:00前时段（x_final[:36]==xhat[:36] 全334天）: '
          f'{"✓" if ok_pre else "✗"}')
    for alpha, beta in ALPHA_BETAS:
        r612, r61218 = results[f'S612 α={alpha}'], results[f'S61218 α={alpha}']
        rel = abs(r61218['total'] - r612['total']) / r612['total']
        print(f'   α={alpha}: S61218 vs S612 相对差 {rel*100:.2f}% '
              f'{"✓（18点近零增量，如预期）" if rel < 0.02 else "⚠ 增量异常，需查"}')
    nb = sum(results[k]['n_branch'] for k in results)
    print(f'   反套利分支总触发: {nb} 次（执行端套利时段=0 由分支保证）')

    print(f'\n5. 指定日期（{best_tag}）:')
    print(f'   {"日期":>10} {"计划kWh":>10} {"计划费元":>10} {"最终购电费元":>11} '
          f'{"偏差费元":>9} {"紧急kWh":>9} {"紧急费元":>10}')
    for ds in FOUR_DAYS:
        d = bd[ds]
        xhat_fee = float(p @ d['xhat']) if 'xhat_fee' not in d else d['xhat_fee']
        print(f'   {ds:>10} {d["xhat"].sum():>10.2f} {xhat_fee:>10.2f} '
              f'{d["plan_fee"]:>11.2f} {d["dev_fee"]:>9.2f} '
              f'{d["emerg"].sum():>9.1f} {d["emerg_fee"]:>10.2f}')

    print(f'\n6. 填写 result3.xlsx（{best_tag}）:')
    import openpyxl
    wb = openpyxl.load_workbook(os.path.join(BASE_DIR, '..', '附件', '附件5',
                                             'result3.xlsx'))
    for sheet, field in [('计划购电量', 'xhat'), ('调整购电量', 'x_final')]:
        ws = wb[sheet]
        for j in range(len(idx_out)):
            ds = str(out_dates.iloc[j].date())
            xv = bd[ds][field]
            roll = np.roll(xv, -1)
            r = 2 + j
            for k in range(T):
                ws.cell(row=r, column=2 + k, value=round(float(roll[k]), 2))
            ws.cell(row=r, column=146, value=round(float(xv.sum()), 2))
            ws.cell(row=r, column=147, value=round(float(p @ xv), 2))
    ws = wb['充放电量']
    if ws.max_row > 1:
        ws.delete_rows(2, ws.max_row - 1)
    blocks = ['0:00-4:00', '4:00-8:00', '8:00-12:00', '12:00-16:00',
              '16:00-20:00', '20:00-24:00']
    r = 2
    for j in range(len(idx_out)):
        ds = str(out_dates.iloc[j].date())
        d = bd[ds]
        for b in range(6):
            sl = slice(b * 24, (b + 1) * 24)
            ws.cell(row=r, column=1, value=out_dates.iloc[j] if b == 0 else None)
            ws.cell(row=r, column=2, value=blocks[b])
            ws.cell(row=r, column=3, value=round(float(d['chg'][sl].sum()), 2))
            ws.cell(row=r, column=4, value=round(float(d['dis'][sl].sum()), 2))
            if b == 0:
                ws.cell(row=r, column=5, value='0:00')
                ws.cell(row=r, column=6, value=round(float(d['e0']), 2))
            elif b == 1:
                ws.cell(row=r, column=5, value='24:00')
                ws.cell(row=r, column=6, value=round(float(d['soc'][-1]), 2))
            r += 1
    ws = wb['紧急购电量']
    if ws.max_row > 1:
        ws.delete_rows(2, ws.max_row - 1)
    r = 2
    n_iv = 0
    for j in range(len(idx_out)):
        ds = str(out_dates.iloc[j].date())
        for m_idx, (label, energy) in enumerate(merge_emergency(bd[ds]['emerg'])):
            ws.cell(row=r, column=1, value=out_dates.iloc[j] if m_idx == 0 else None)
            ws.cell(row=r, column=2, value=label)
            ws.cell(row=r, column=3, value=round(energy, 2))
            r += 1
            n_iv += 1
    wb.save(os.path.join(OUTPUT_DIR, 'result3.xlsx'))
    print(f'   已保存 result3.xlsx（紧急购电 {n_iv} 段）')

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    for ai, (alpha, beta) in enumerate(ALPHA_BETAS):
        ax = axes[ai]
        keys = list(STRATEGIES)
        plan_v = [results[f'{k} α={alpha}']['plan'] / 1e4 for k in keys]
        dev_v = [results[f'{k} α={alpha}']['dev'] / 1e4 for k in keys]
        em_v = [results[f'{k} α={alpha}']['emerg'] / 1e4 for k in keys]
        xpos = np.arange(len(keys))
        ax.bar(xpos, plan_v, 0.55, label='计划购电费(最终生效)', color='steelblue')
        ax.bar(xpos, dev_v, 0.55, bottom=plan_v, label='偏差费(±)', color='orange')
        ax.bar(xpos, em_v, 0.55, bottom=np.array(plan_v) + np.array(dev_v),
               label='紧急购电费', color='red', alpha=0.8)
        for k, key in enumerate(keys):
            tv = results[f'{key} α={alpha}']['total'] / 1e4
            ax.text(xpos[k], tv + 8, f'{tv:,.0f}', ha='center', fontweight='bold')
        ax.set_xticks(xpos)
        ax.set_xticklabels(keys)
        ax.set_ylabel('费用 / 万元')
        ax.set_title(f'四策略全年费用对比（α={alpha}, β={beta}）')
        ax.legend(fontsize=9)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'Q3策略对比.png'), dpi=150)
    print('\n图已保存: Q3策略对比.png')

    fig, axes = plt.subplots(2, 2, figsize=(13, 7))
    d = bd['2025-12-21']
    x = np.arange(1, T + 1) / 6
    axes[0, 0].plot(x, fc_144(fc[(pd.Timestamp('2025-12-21'), '0:00')], 0),
                    'b-', lw=1.5, label='0:00预报')
    axes[0, 0].plot(x, fc_144(fc[(pd.Timestamp('2025-12-21'), '12:00')], 12),
                    'g--', lw=1.5, label='12:00预报')
    axes[0, 0].plot(x, G_all[i21] * 6, 'k-', lw=1.8, label='实际光伏')
    axes[0, 0].set_ylabel('功率 / kW'); axes[0, 0].set_xlabel('时刻 / h')
    axes[0, 0].set_title('12-21 光伏：预报 vs 实际')
    axes[0, 0].legend(); axes[0, 0].grid(alpha=0.3)
    axes[0, 1].plot(x, d['xhat'], 'b-', lw=1.5, label='0:00计划购电')
    axes[0, 1].plot(x, d['x_final'], 'r-', lw=1.5, label='调整后购电')
    axes[0, 1].set_ylabel('购电量 / kWh/10min'); axes[0, 1].set_xlabel('时刻 / h')
    axes[0, 1].set_title('计划购电 vs 调整后购电')
    axes[0, 1].legend(); axes[0, 1].grid(alpha=0.3)
    axes[1, 0].plot(x, d['soc'], 'k-', lw=1.8)
    axes[1, 0].axhline(SMIN, color='gray', ls=':')
    axes[1, 0].axhline(SMAX, color='gray', ls='--')
    axes[1, 0].set_ylabel('SOC / kWh'); axes[1, 0].set_xlabel('时刻 / h')
    axes[1, 0].set_title('执行层SOC轨迹'); axes[1, 0].grid(alpha=0.3)
    axes[1, 1].bar(x, d['emerg'], width=1 / 6, color='red', alpha=0.7)
    axes[1, 1].set_ylabel('紧急购电 / kWh/10min'); axes[1, 1].set_xlabel('时刻 / h')
    axes[1, 1].set_title(f'紧急购电（合计 {d["emerg"].sum():.0f} kWh）')
    axes[1, 1].grid(alpha=0.3)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'Q3滚动修正示意.png'), dpi=150)
    print('图已保存: Q3滚动修正示意.png')

    print('=' * 72)
    print(f'第三问完成（交付: {best_tag}）')
    print('=' * 72)



if __name__ == '__main__':
    main()
