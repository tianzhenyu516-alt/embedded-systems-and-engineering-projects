
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

plt.rcParams['font.family'] = 'SimHei'
plt.rcParams['axes.unicode_minus'] = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', '附件')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

a1 = pd.read_excel(os.path.join(DATA_DIR, '附件1.xlsx'))
load = pd.read_excel(os.path.join(DATA_DIR, '附件2.xlsx'), sheet_name='小区负载')
pv = pd.read_excel(os.path.join(DATA_DIR, '附件2.xlsx'), sheet_name='光伏发电实际功率')
a3 = pd.read_excel(os.path.join(DATA_DIR, '附件3.xlsx'))
a4 = pd.read_excel(os.path.join(DATA_DIR, '附件4.xlsx'))

a3['日期'] = a3['日期'].ffill()
a3['日期'] = pd.to_datetime(a3['日期'])

def hour_col(h):
    return h * 6 - 1

d = pd.to_datetime(load.iloc[:, 0])
L = load.iloc[:, 1:].values
G = pv.iloc[:, 1:].values
P4 = a4.iloc[:, 1:].values
P1 = a1['电价'].values
net_load = L - G

print('=' * 70)
print('数据描述与信息集分析（LP建模导向 · 最终版）')
print('=' * 70)

print('\n一、LP模型变量清单')
print('-' * 70)
variables = pd.DataFrame({
    '变量': ['电价 p_t', '负载 load_t', '光伏 pv_t', '光伏预报', '购电量 x_t',
            '充电量 c_t', '放电量 d_t', '弃光量 e_t', '储能SOC S_t'],
    '类型': ['外生参数', '外生参数', '外生参数', '外生参数(仅Q3)',
            '决策变量', '决策变量', '决策变量', '决策变量', '状态变量'],
    '在LP中的角色': [
        '目标函数系数（购电成本）',
        '功率平衡约束右端项',
        '功率平衡约束右端项',
        'Q3计划层的pv_t来源',
        '目标函数 min Σ p_t·x_t',
        'SOC递推：+η·c_t；受功率上限约束',
        'SOC递推：−d_t/η；受功率上限约束',
        '功率平衡松弛项（光伏富余时>0）',
        '递推状态：S_{t+1}=S_t+ηc_t−d_t/η，bounds[1200,10800]'
    ]
})
print(variables.to_string(index=False))
variables.to_excel(os.path.join(OUTPUT_DIR, 'LP变量清单.xlsx'), index=False)
print('LP中每个变量都有固定角色，不存在"筛掉哪个变量"的问题。')

print('\n二、信息集确认：附件1 = 全年列均值')
print('-' * 70)

dev_load = np.abs(a1['小区负载'].values - L.mean(axis=0)).max()
dev_pv = np.abs(a1['光伏发电预测功率'].values - G.mean(axis=0)).max()
dev_price = np.abs(P1 - P4.mean(axis=0)).max()

print(f'  负载: 附件1 vs 列均值 最大偏差 = {dev_load:.6f} kW')
print(f'  光伏: 附件1 vs 列均值 最大偏差 = {dev_pv:.6f} kW')
print(f'  电价: 附件1 vs 附件4列均值 最大偏差 = {dev_price:.6f} 元')
print('  → 附件1是全年气候平均日，即0:00制定计划时唯一可得信息。')
print('  → Q2/Q3计划层必须用附件1；此假设必须写进论文。')
info_df = pd.DataFrame({
    '验证项': ['附件1负载 vs 列均值', '附件1光伏 vs 列均值', '附件1电价 vs 列均值'],
    '最大偏差': [f'{dev_load:.6f}', f'{dev_pv:.6f}', f'{dev_price:.6f}'],
    '结论': ['附件1=列均值'] * 3
})
info_df.to_excel(os.path.join(OUTPUT_DIR, '信息集确认.xlsx'), index=False)

print('\n三、描述性统计')
print('-' * 70)

daily_load = L.sum(axis=1) / 6
daily_pv = G.sum(axis=1) / 6
daily_net = daily_load - daily_pv
surplus = np.maximum(G - L, 0)
night_cols = [hour_col(h) for h in [1, 2, 3, 4, 5, 22, 23, 24]]

print(f'【负载】 均值 {L.mean():.1f} kW，范围[{L.min():.0f},{L.max():.0f}]，'
      f'日均 {daily_load.mean()/1000:.1f} MWh，逐时段σ≈{L.std(axis=0).mean():.0f} kW，日总量波动20%')
print(f'【光伏】 均值 {G.mean():.1f} kW，最大 {G.max():.0f} kW，日均 {daily_pv.mean()/1000:.1f} MWh，'
      f'自给率 {G.sum()/L.sum()*100:.1f}%')
print(f'       无调度年弃光 {surplus.sum()/6/1e4:.0f} 万kWh（占发电{surplus.sum()/G.sum()*100:.1f}%）')
print(f'【净负载】 均值 {net_load.mean():.1f} kW，范围[{net_load.min():.0f},{net_load.max():.0f}]')
print(f'       >0时段占 {(net_load>0).mean()*100:.1f}%（需购电），<0时段占 {(net_load<0).mean()*100:.1f}%（富余）')
print(f'       日净购电 {daily_net.mean()/1000:.1f} MWh，逐日波动 {daily_net.std()/daily_net.mean()*100:.0f}%')
print(f'【电价】 附件1: min {P1.min():.4f}, max {P1.max():.4f}, mean {P1.mean():.4f}, 峰谷比 {P1.max()/P1.min():.1f}')
print(f'       附件4: mean {P4.mean():.3f}, P5={np.percentile(P4,5):.3f}, P95={np.percentile(P4,95):.3f}, '
      f'min={P4.min():.3f}, >1.2元占{(P4>1.2).mean()*100:.1f}%')
print(f'【夜间光伏】 夜间时段最大值 {G[:, night_cols].max():.2f} kW ≈ 0'
      f' → 18:00预报对当晚无信息量')

print('\n四、相关性与滞后分析')
print('-' * 70)

flat = pd.DataFrame({'负载': L.flatten(), '光伏': G.flatten(),
                     '净负载': net_load.flatten(), '电价': P4.flatten()})
corr = flat.corr()
print('逐时段Pearson相关矩阵：')
print(corr.round(3).to_string())
print('解读：净负载与光伏强负相关(-0.88)；净负载与电价弱正相关(0.26)，')
print('电价反映电网整体供需而非本小区供需，二者分别进入LP。')

day_feat = pd.DataFrame({
    '日总负载(kWh)': daily_load,
    '日总光伏(kWh)': daily_pv,
    '日净购电(kWh)': daily_net,
    '日均价(元/kWh)': P4.mean(axis=1),
})
print('\n日级相关矩阵：')
print(day_feat.corr().round(3).to_string())

x = np.arange(1, 145) / 6

print('\n五、光伏预报误差分析（Q3依据）')
print('-' * 70)

f0 = a3[a3['预报时刻'] == '0:00'].reset_index(drop=True)
dates = f0['日期']
pv_act = pv.set_index(pv.columns[0])
act = pv_act.loc[dates].reset_index(drop=True)
act_hourly = act.iloc[:, [hour_col(h) for h in range(1, 25)]].values
fore0 = f0[[f'预报{i}小时' for i in range(1, 25)]].values
f6 = a3[a3['预报时刻'] == '6:00'].reset_index(drop=True)
fore6 = f6[[f'预报{i}小时' for i in range(1, 25)]].values

err0 = fore0[:, 11:17] - act_hourly[:, 11:17]
err6 = fore6[:, 5:11] - act_hourly[:, 11:17]
print(f'0:00预报 午后: 偏差 {err0.mean():.1f} kW, MAE {np.abs(err0).mean():.1f} kW')
print(f'6:00预报 午后: 偏差 {err6.mean():.1f} kW, MAE {np.abs(err6).mean():.1f} kW')
print(f'  → 6:00滚动更新MAE降 {(1-np.abs(err6).mean()/np.abs(err0).mean())*100:.0f}%，滚动修正有真实收益')
print(f'  → 0:00预报系统性{"高估" if err0.mean()>0 else "低估"} {abs(err0.mean()):.0f} kW')

fig, ax = plt.subplots(figsize=(7, 4.5))
xpos = np.arange(2)
ax.bar(xpos - 0.18, [np.abs(err0).mean(), np.abs(err6).mean()], 0.36, label='MAE', color='steelblue')
ax.bar(xpos + 0.18, [np.abs(err0.mean()), np.abs(err6.mean())], 0.36, label='|偏差|', color='coral')
ax.set_xticks(xpos); ax.set_xticklabels(['0:00预报', '6:00预报'])
ax.set_ylabel('误差 / kW'); ax.set_title('午后光伏预报误差（12-17时）')
for i, v in enumerate([np.abs(err0).mean(), np.abs(err6).mean()]):
    ax.text(i - 0.18, v, f'{v:.0f}', ha='center', va='bottom')
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '预报误差对比.png'), dpi=150)
print('  图表已保存: output/预报误差对比.png')

print('\n六、三类日聚类（仅情景分析素材）')
print('-' * 70)

from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

X_day = np.column_stack([daily_load, daily_pv, P4.mean(axis=1), L.std(axis=1), G.std(axis=1)])
X_scaled = StandardScaler().fit_transform(X_day)
km = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X_scaled)
labels = km.labels_
order = np.argsort([daily_net[labels == i].mean() for i in range(3)])
name_map = {order[0]: '光伏富余日', order[1]: '正常日', order[2]: '高需求日'}
day_type = np.array([name_map[l] for l in labels])

for i in range(3):
    m = labels == i
    print(f"  {name_map[i]}: {m.sum()}天, 负载{daily_load[m].mean()/1000:.1f}MWh, "
          f"光伏{daily_pv[m].mean()/1000:.1f}MWh, 净购电{daily_net[m].mean()/1000:.1f}MWh")
print('⚠ result2/result3要求逐日输出；紧急购电来自每日对均值的独特偏差，')
print('  聚类会将其抹平。Q2起必须365天逐日仿真（单天LP毫秒级，全年仅数秒）。')

fig, ax = plt.subplots(figsize=(9, 4.5))
for i in range(3):
    m = labels == i
    ax.plot(x, net_load[m].mean(axis=0), lw=2, label=f"{name_map[i]} ({m.sum()}天)")
ax.axhline(y=0, color='gray', ls='--', alpha=0.5)
ax.set_xlabel('时刻 / h'); ax.set_ylabel('净负载 / kW')
ax.set_title('三类日的平均净负载曲线（情景分析素材）')
ax.legend()
plt.tight_layout()
plt.savefig(os.path.join(OUTPUT_DIR, '三类日情景.png'), dpi=150)
print('  图表已保存: output/三类日情景.png')

print('\n七、建模输入数据集（唯一产出文件）')
print('-' * 70)

def forecast_to_10min(hourly_24):
    t_hour = np.arange(1, 25)
    t_10min = np.arange(1, 145) / 6
    vals = np.concatenate([[0.0], hourly_24])
    return np.interp(t_10min, np.concatenate([[0.0], t_hour]), vals)

f0_all = a3[a3['预报时刻'] == '0:00'].sort_values('日期')
fore0_10min = np.array([forecast_to_10min(
    row[[f'预报{i}小时' for i in range(1, 25)]].values.astype(float))
    for _, row in f0_all.iterrows()])

p75, p25 = np.percentile(P4, 75), np.percentile(P4, 25)
peak_flag = np.where(P4 > p75, '峰', np.where(P4 < p25, '谷', '平'))

model_data = pd.DataFrame({
    '日期': np.repeat(d.values, 144),
    '时段': np.tile(np.arange(144), 365),
    '负载(kW)': L.flatten(),
    '光伏实际(kW)': G.flatten(),
    '净负载(kW)': net_load.flatten(),
    '电价波动(元/kWh)': P4.flatten(),
    '电价均值(元/kWh)': np.tile(P1, 365),
    '光伏预报0时(kW)': fore0_10min.flatten(),
    '峰谷标识': peak_flag.flatten(),
    '日类型': np.repeat(day_type, 144)
})

model_data.to_pickle(os.path.join(OUTPUT_DIR, 'model_data.pkl'))
model_data.to_csv(os.path.join(OUTPUT_DIR, 'model_data.csv'), index=False, encoding='utf-8-sig')
print(f'  model_data: {model_data.shape[0]}行 × {model_data.shape[1]}列')
print(f'  列: {list(model_data.columns)}')
print('  已保存: output/model_data.pkl / model_data.csv')
print('  → Q1~Q4所有LP与仿真从此取数。')

print('\n' + '=' * 70)
print('八、结论：数据 → LP模型的输入链条')
print('=' * 70)
print('''
  附件1 = 列均值日
    → 0:00计划的信息集 = {均值负载, 均值光伏, 当日电价}
    → Q2/Q3计划层LP的唯一输入（模型假设，必须写明）

  负载σ≈960kW（无预报）
    → 实际逐日偏离均值 → Q2执行层紧急购电 e_t=max(0,缺口)
    → 5倍电价惩罚是主要成本项 → 必须逐日仿真（365天）

  弃光312万kWh/年 + 峰谷比3.8
    → 储能两大价值 = 消纳弃光 + 峰谷套利 → Q1策略预判"三充两放"

  0:00预报午后MAE 462kW（低估68kW）；6:00降至274kW
    → Q3滚动修正有真实收益；18:00预报无价值（夜间光伏恒零）

  附件4: P5=0.34, P95=1.34, min=0.008
    → Q4模型结构不变，仅替换价格矩阵；套利空间变大+5倍惩罚更痛
''')
print('=' * 70)
