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

ENDS = np.arange(1, 145) / 6


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
    vals = np.concatenate([[0.0], hourly_24])
    return np.interp(ENDS, np.concatenate([[0.0], np.arange(1, 25)]), vals)


def fc_144(hourly_24, h):
    return np.interp(ENDS, np.arange(h + 1, h + 25), hourly_24)


def solve_day_lp(price, load, pv, dt=1 / 6, eta=ETA, s0=S0,
                 smin=SMIN, smax=SMAX, pmax=PMAX, s_end=None, free_end=False):
    from scipy.optimize import linprog
    T = len(price)
    Emax = pmax * dt
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
    if free_end:
        bounds[5 * T - 1] = (smin, smax)
    else:
        se = s0 if s_end is None else s_end
        bounds[5 * T - 1] = (se, se)
    res = linprog(obj, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    assert res.status == 0, f'LP求解失败: {res.message}'
    x = res.x
    return dict(buy=x[:T], chg=x[T:2 * T], dis=x[2 * T:3 * T], cur=x[3 * T:4 * T],
                soc=x[4 * T:5 * T], total_buy=float(x[:T].sum()),
                cost=float(np.dot(price, x[:T])))


def solve_revised_lp(price_w, pv_w, load_w, xhat_w, s0, dt=1 / 6, eta=ETA,
                     smin=SMIN, smax=SMAX, pmax=PMAX):
    from scipy.optimize import linprog
    W = len(price_w)
    Emax = pmax * dt
    n = 7 * W
    obj = np.concatenate([price_w, np.zeros(3 * W), np.zeros(W),
                          0.5 * price_w, 0.5 * price_w])
    A_eq = np.zeros((3 * W, n))
    b_eq = np.zeros(3 * W)
    for t in range(W):
        r = t
        A_eq[r, t] = 1.0
        A_eq[r, W + t] = -1.0
        A_eq[r, 2 * W + t] = 1.0
        A_eq[r, 3 * W + t] = -1.0
        b_eq[r] = (load_w[t] - pv_w[t]) * dt
        r = W + t
        A_eq[r, W + t] = -eta
        A_eq[r, 2 * W + t] = 1.0 / eta
        A_eq[r, 4 * W + t] = 1.0
        if t > 0:
            A_eq[r, 4 * W + t - 1] = -1.0
        r = 2 * W + t
        A_eq[r, t] = 1.0
        A_eq[r, 6 * W + t] = -1.0
        A_eq[r, 5 * W + t] = 1.0
        b_eq[r] = xhat_w[t]
    b_eq[W] = s0
    bounds = ([(0, None)] * W + [(0, Emax)] * W + [(0, Emax)] * W
              + [(0, float(u)) for u in pv_w * dt]
              + [(smin, smax)] * W + [(0, None)] * W + [(0, None)] * W)
    res = linprog(obj, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    assert res.status == 0, f'修正LP求解失败: {res.message}'
    x = res.x
    return dict(x=x[:W], chg=x[W:2 * W], dis=x[2 * W:3 * W], cur=x[3 * W:4 * W],
                soc=x[4 * W:5 * W], short=x[5 * W:6 * W], exc=x[6 * W:7 * W])


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


def fmt_interval(j, k):
    def m2s(m):
        m = int(round(m))
        if m >= 1440:
            return '0:00+1'
        return f'{m // 60}:{m % 60:02d}'
    return f'{m2s(10 * j)}-{m2s(10 * (k + 1))}'


def merge_emergency(emerg, eps=1e-9):
    return [(fmt_interval(a, b), float(emerg[a:b + 1].sum()))
            for a, b in runs_of(emerg > eps)]
