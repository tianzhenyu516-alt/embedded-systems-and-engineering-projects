import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

df = pd.read_excel('C:/Users/20894/Desktop/C题/第一问/result1.xlsx', '计划购电量')
checks = {
    '0:10-0:20': 1406.33,
    '12:00-12:10': 480.41,
    '16:00-16:10': 445.43,
    '18:00-18:10': 531.89,
    '23:50-0:00+1': 574.12,
    '0:00+1-0:10+1': 1406.64,
}
ok = True
for label, want in checks.items():
    got = float(df.loc[df['时间段'] == label, '购电量'].iloc[0])
    good = abs(got - want) < 0.01
    ok = ok and good
    print(f'{label:>14}: 文件={got:>8.2f}  应为={want:>8.2f}  ' + ('OK' if good else 'FAIL'))
print('错位修复验证:', '全部通过' if ok else '存在失败')
