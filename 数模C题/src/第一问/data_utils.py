import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', '附件')
OUTPUT_DIR = BASE_DIR

ETA = 0.9
SMIN, SMAX = 1200.0, 10800.0
S0 = 6000.0
PMAX = 5000.0


def load_all():
    a1 = pd.read_excel(os.path.join(DATA_DIR, '附件1.xlsx'))
    load = pd.read_excel(os.path.join(DATA_DIR, '附件2.xlsx'), sheet_name='小区负载')
    pv = pd.read_excel(os.path.join(DATA_DIR, '附件2.xlsx'), sheet_name='光伏发电实际功率')
    a3 = pd.read_excel(os.path.join(DATA_DIR, '附件3.xlsx'))
    a4 = pd.read_excel(os.path.join(DATA_DIR, '附件4.xlsx'))
    a3['日期'] = a3['日期'].ffill()
    a3['日期'] = pd.to_datetime(a3['日期'])
    return a1, load, pv, a3, a4


def hour_col(h):
    return h * 6 - 1


def forecast_to_10min(hourly_24):
    t_hour = np.arange(1, 25)
    t_10min = np.arange(1, 145) / 6
    vals = np.concatenate([[0.0], hourly_24])
    t_all = np.concatenate([[0.0], t_hour])
    return np.interp(t_10min, t_all, vals)


def solve_day_lp(price, load, pv, dt=1 / 6, eta=ETA, s0=S0,
                 smin=SMIN, smax=SMAX, pmax=PMAX, s_end=None):
    from scipy.optimize import linprog
    T = len(price)
    Emax = pmax * dt
    if s_end is None:
        s_end = s0
    n = 5 * T
    obj = np.concatenate([price, np.zeros(4 * T)])
    A_eq = np.zeros((2 * T, n))
    b_eq = np.zeros(2 * T)
    for t in range(T):
        A_eq[t, t] = 1.0
        A_eq[t, T + t] = -1.0
        A_eq[t, 2 * T + t] = 1.0
        A_eq[t, 3 * T + t] = -1.0
        b_eq[t] = (load[t] - pv[t]) * dt
        r = T + t
        A_eq[r, T + t] = -eta
        A_eq[r, 2 * T + t] = 1.0 / eta
        A_eq[r, 4 * T + t] = 1.0
        if t > 0:
            A_eq[r, 4 * T + t - 1] = -1.0
    b_eq[T] = s0
    bounds = ([(0, None)] * T + [(0, Emax)] * T + [(0, Emax)] * T
              + [(0, float(u)) for u in pv * dt] + [(smin, smax)] * T)
    bounds[5 * T - 1] = (s_end, s_end)
    res = linprog(obj, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    assert res.status == 0, f'LP求解失败: {res.message}'
    x = res.x
    return dict(buy=x[:T], chg=x[T:2 * T], dis=x[2 * T:3 * T], cur=x[3 * T:4 * T],
                soc=x[4 * T:5 * T], total_buy=float(x[:T].sum()),
                cost=float(np.dot(price, x[:T])))


def runs_of(mask):
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None:
            s = i
        if not v and s is not None:
            out.append((s, i - 1))
            s = None
    if s is not None:
        out.append((s, len(mask) - 1))
    return out


def fmt_period(j, k=None):
    if k is None:
        k = j
    def m2s(m):
        m = m % 1440
        return f'{m // 60}:{m % 60:02d}'
    return f'{m2s(10 * j)}-{m2s(10 * k + 10)}'
