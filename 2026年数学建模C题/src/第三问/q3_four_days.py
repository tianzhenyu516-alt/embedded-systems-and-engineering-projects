import pickle, os, sys
import numpy as np
import pandas as pd
sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))
a1 = pd.read_excel(os.path.join(BASE, '..', '附件', '附件1.xlsx'))
p = a1['电价'].values

with open(os.path.join(BASE, '_q3v2_S61218_a1.22.pkl'), 'rb') as f:
    r = pickle.load(f)
print('S61218 α=1.22 指定四日（修正标签版）:')
print(f'{"日期":>12}{"计划kWh":>11}{"计划费(x̂)元":>13}{"最终购电费元":>13}'
      f'{"偏差费元":>10}{"紧急kWh":>10}{"紧急费元":>11}{"当日总费元":>11}')
for ds in ['2025-03-20', '2025-06-21', '2025-09-23', '2025-12-21']:
    d = r['detail'][ds]
    xf = float(p @ d['xhat'])
    tot = d['plan_fee'] + d['dev_fee'] + d['emerg_fee']
    print(f'{ds:>12}{d["xhat"].sum():>11.2f}{xf:>13.2f}{d["plan_fee"]:>13.2f}'
          f'{d["dev_fee"]:>10.2f}{d["emerg"].sum():>10.1f}'
          f'{d["emerg_fee"]:>11.2f}{tot:>11.2f}')

print('\n各策略 12-21 当日总费（元）:')
for key in ['S0', 'S6', 'S612', 'S61218']:
    with open(os.path.join(BASE, f'_q3v2_{key}_a1.22.pkl'), 'rb') as f:
        rr = pickle.load(f)
    d = rr['detail']['2025-12-21']
    tot = d['plan_fee'] + d['dev_fee'] + d['emerg_fee']
    print(f'  {key:>8}: 计划 {d["plan_fee"]:>10.2f} + 偏差 {d["dev_fee"]:>8.2f} '
          f'+ 紧急 {d["emerg_fee"]:>9.2f} = {tot:>11.2f}'
          f'（紧急 {d["emerg"].sum():>8.1f} kWh）')
