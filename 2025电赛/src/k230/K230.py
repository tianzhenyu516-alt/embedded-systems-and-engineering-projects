"""
K230 钢珠识别 — 列亮度扫描版
================================================
物理结构：
  - 25cm塑料水管从中间切开成U型槽
  - 金属钢珠在U型槽里滚动
  - 内径1.3cm，从上方看球被管壁挡住大部分
  - 相机需能看到管子全长（约25cm占满画面宽度）

检测原理：
  - 不找球的形状（球太小被管壁挡住了）
  - 而是沿管子方向逐列扫描亮度
  - 金属球反光 >> 塑料管壁 → 最亮的区域就是球的位置
  - 比YOLO和传统CV都靠谱
================================================
"""
import time, os, gc, cv2
import ulab.numpy as np
from media.sensor import *
from media.display import *
from media.media import *
from machine import UART

# =========================================================================
# 校准区（必须根据实际画面调整！）
# =========================================================================
# 管子在画面中的位置 — 用IDE看画面，把管子左端和右端的像素x填进来
PIPE_X1      = 50        # 管子左端像素x
PIPE_X2      = 590       # 管子右端像素x
# 管子的上下范围（只扫描这个区域的亮度）
PIPE_Y1      = 200       # 管子上边缘像素y
PIPE_Y2      = 280       # 管子下边缘像素y

PIPE_LEN_CM  = 25.0      # 管子总长 cm（物理长度）

# 检测参数
COL_MIN_BRIGHT = 160     # 列平均亮度要超过这个才算候选（钢珠反光一般>160）
MIN_GAP        = 30      # 两个亮区间距>30列才认为是独立的球

UART_ID      = 3
UART_BAUD    = 9600
SEND_MS      = 30

# =========================================================================
# 硬件初始化
# =========================================================================
uart = UART(UART_ID, UART_BAUD, timeout=50)
print("UART{} @{}".format(UART_ID, UART_BAUD))

try:
    sensor.stop()
except Exception:
    pass
try:
    Display.deinit()
except Exception:
    pass
time.sleep_ms(200)

sensor = Sensor()
sensor.reset()
time.sleep_ms(200)
sensor.set_framesize(width=640, height=480, chn=CAM_CHN_ID_0)
sensor.set_pixformat(Sensor.RGB888, chn=CAM_CHN_ID_0)
try:
    sensor.set_auto_exposure(True, exposure=12000)
except Exception:
    pass
Display.init(Display.ST7701, width=800, height=480, to_ide=True)
MediaManager.init()
sensor.run()
print("[CAM] 640x480 RGB888")

# =========================================================================
# 列亮度扫描检测
# =========================================================================
def detect_ball_column(gray_np):
    """
    沿管子方向逐列求平均亮度，找最亮的区域=球的位置
    返回 (found, cx, max_brightness)
    """
    roi = gray_np[PIPE_Y1:PIPE_Y2, PIPE_X1:PIPE_X2]
    # 每列的平均亮度（沿y轴求均值，得到一维数组）
    col_mean = np.mean(roi, axis=0)  # shape = (ROI_W,)
    
    n = len(col_mean)
    if n == 0:
        return False, -1, 0
    
    # 找全局最亮列
    best_col = 0
    best_val = 0
    for i in range(n):
        v = int(col_mean[i])
        if v > best_val:
            best_val = v
            best_col = i
    
    if best_val < COL_MIN_BRIGHT:
        return False, -1, best_val
    
    # 找最亮列附近的连续亮区中心
    total = 0
    wsum = 0
    for i in range(max(0, best_col - 15), min(n, best_col + 16)):
        v = int(col_mean[i])
        if v > COL_MIN_BRIGHT:
            total += v
            wsum += v * i
    
    if total <= 0:
        return False, -1, best_val
    
    center = wsum / total
    cx = int(PIPE_X1 + center)
    return True, cx, best_val

# =========================================================================
# 跟踪滤波
# =========================================================================
pos_hist = []
last_pos = 0.0
lost_cnt = 0

def track(found, cx):
    global last_pos, lost_cnt
    if not found:
        lost_cnt += 1
        if lost_cnt <= 15:
            return True, last_pos
        return False, 0.0
    pos = (cx - PIPE_X1) / max(1, PIPE_X2 - PIPE_X1) * PIPE_LEN_CM - PIPE_LEN_CM / 2.0
    pos = max(-PIPE_LEN_CM / 2.0, min(PIPE_LEN_CM / 2.0, pos))
    pos_hist.append(pos)
    if len(pos_hist) > 5:
        pos_hist.pop(0)
    s = sorted(pos_hist)
    last_pos = s[len(s) // 2]
    lost_cnt = 0
    return True, last_pos

# =========================================================================
# UART 发送
# =========================================================================
def uart_send(valid, pos_cm):
    try:
        val = int((pos_cm + PIPE_LEN_CM / 2.0) * 100)
        if val < 0: val = 0
        if val > 65535: val = 65535
        ph = (val >> 8) & 0xFF
        pl_b = val & 0xFF
        flag = 1 if valid else 0
        chk = (ph + pl_b + flag) & 0xFF
        uart.write(bytearray([0xAA, 0x55, ph, pl_b, flag, chk, 0x0D]))
    except Exception:
        pass

# =========================================================================
# 主循环
# =========================================================================
print("=== K230 钢珠识别（列亮度扫描）===")
print("管子区域: x=[{}, {}] y=[{}, {}]".format(PIPE_X1, PIPE_X2, PIPE_Y1, PIPE_Y2))
frame = 0
t_send = time.ticks_ms()
t_fps  = time.ticks_ms()

try:
    while True:
        img = sensor.snapshot()
        if img is None:
            time.sleep_ms(5)
            continue
        
        img_np = img.to_numpy_ref()
        gray_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        
        found, cx, brightness = detect_ball_column(gray_np)
        valid, pos_cm = track(found, cx)
        
        # UART
        now = time.ticks_ms()
        if time.ticks_diff(now, t_send) >= SEND_MS:
            t_send = now
            uart_send(valid, pos_cm)
        
        # 画管子区域（细黄框）
        img.draw_rectangle(PIPE_X1, PIPE_Y1, PIPE_X2 - PIPE_X1, PIPE_Y2 - PIPE_Y1, 
                          color=(255, 255, 0), thickness=1)
        
        # 画球位置
        if found:
            img.draw_line(cx, PIPE_Y1, cx, PIPE_Y2, color=(0, 255, 0), thickness=3)
            img.draw_rectangle(cx - 15, PIPE_Y1 - 5, 30, 10, color=(0, 255, 0), thickness=2)
        
        # 显示
        Display.show_image(img, x=80, y=0)
        del img_np
        
        frame += 1
        if frame % 15 == 0:
            fps = 15000 / max(1, time.ticks_diff(now, t_fps))
            t_fps = now
            if found:
                print("=> {:.1f}fps BALL cx={} pos={:.1f}cm bright={}".format(fps, cx, pos_cm, brightness))
            else:
                print("=> {:.1f}fps LOST bright={}".format(fps, brightness))
        
        gc.collect()

except KeyboardInterrupt:
    pass
except Exception as e:
    print("异常:", e)
finally:
    try:
        sensor.stop()
    except Exception:
        pass
    try:
        MediaManager.deinit()
    except Exception:
        pass
