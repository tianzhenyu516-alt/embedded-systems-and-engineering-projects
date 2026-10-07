"""
v33: 极速检测 + 舵机扫描追踪
"""
from media.sensor import *
from media.display import *
from media.media import *
import time
import gc
import cv2
from ulab import numpy as np
from machine import PWM, FPIOA, UART

DETECT_W = 640
DETECT_H = 480
SCAN_START = 0
SCAN_END = 270
SCAN_STEP = 10
SCAN_WAIT = 3

uart = UART(3, 9600, timeout=50)

def send_task(tid):
    try:
        uart.write(bytearray([0xFF, tid, tid, tid, tid, 0x0D]))
    except Exception:
        pass

def recv_task():
    data = uart.read(6)
    if data and len(data) == 6 and data[0] == 0xFF and data[5] == 0x0D:
        if data[1] == data[2] == data[3] == data[4]:
            return data[1]
    return None

def draw_cross(img, cx, cy, size=20, color=(255, 0, 0), thickness=3):
    img.draw_line(cx - size, cy, cx + size, cy, color=color, thickness=thickness)
    img.draw_line(cx, cy - size, cx, cy + size, color=color, thickness=thickness)

def find_and_check(gray_np, img_np):
    # 缩小到320x240做检测，速度提升4倍
    small = cv2.resize(gray_np, (320, 240))
    edges = cv2.Canny(small, 40, 120)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best = None
    best_area = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 800:
            continue
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
        if len(approx) != 4:
            continue
        x, y, w, h = cv2.boundingRect(approx)
        if w < 25 or h < 20:
            continue
        ratio = max(w, h) / max(min(w, h), 1)
        if ratio < 1.0 or ratio > 2.0:
            continue

        # 坐标放大2倍回原图
        X, Y, W, H = x*2, y*2, w*2, h*2

        bh = max(2, min(8, min(W, H) // 10))
        m = max(5, int(min(W, H) * 0.15))
        y1, y2 = max(0, Y + m), min(DETECT_H, Y + H - m)
        x1, x2 = max(0, X + m), min(DETECT_W, X + W - m)
        if y2 <= y1 or x2 <= x1:
            continue

        border_sum = 0
        border_cnt = 0
        top = gray_np[Y:min(Y+bh, DETECT_H), X:X+W]
        bot = gray_np[max(Y+H-bh, 0):Y+H, X:X+W]
        lef = gray_np[Y:Y+H, X:min(X+bh, DETECT_W)]
        rig = gray_np[Y:Y+H, max(X+W-bh, 0):X+W]
        for strip in (top, bot, lef, rig):
            if strip.size > 0:
                border_sum += int(np.sum(strip))
                border_cnt += strip.size
        if border_cnt == 0:
            continue
        border_mean = border_sum // border_cnt

        inner = gray_np[y1:y2, x1:x2]
        inner_mean = int(np.mean(inner))
        inner_std = int(np.std(inner))
        if inner_mean < 15:
            continue
        if border_mean >= inner_mean * 0.93:
            continue
        if inner_std > 35:
            continue

        roi = img_np[y1:y2, x1:x2]
        cr = int(np.mean(roi[:,:,0]))
        cg = int(np.mean(roi[:,:,1]))
        mx = max(cr, cg)
        mn = min(cr, cg)
        if cr > 200 and cg > 200:
            continue
        if (mx - mn) > mx * 0.4:
            continue

        if area > best_area:
            best_area = area
            best = (X, Y, W, H)

    return best, len(contours)

# 初始化外设
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
sensor.set_framesize(width=DETECT_W, height=DETECT_H, chn=CAM_CHN_ID_0)
sensor.set_pixformat(Sensor.RGB888, chn=CAM_CHN_ID_0)
try:
    sensor.set_auto_exposure(True, exposure=12000)
except Exception:
    pass
Display.init(Display.ST7701, width=800, height=480, to_ide=True)
MediaManager.init()
sensor.run()

fpioa = FPIOA()
fpioa.set_function(46, FPIOA.PWM2)
pan_servo = PWM(2, freq=50, duty=0)
fpioa.set_function(47, FPIOA.PWM3)
tilt_servo = PWM(3, freq=50, duty=0)

def servo_angle_pan(pwm, angle):
    if angle < 0: angle = 0
    if angle > 270: angle = 270
    pulse_us = int(500 + (angle / 270.0) * 2000)
    pwm.duty_u16(int(pulse_us / 20000.0 * 65535))

def servo_angle_tilt(pwm, angle):
    if angle < 0: angle = 0
    if angle > 180: angle = 180
    pulse_us = int(500 + (angle / 180.0) * 2000)
    pwm.duty_u16(int(pulse_us / 20000.0 * 65535))

pan = 135
tilt = 115
servo_angle_pan(pan_servo, pan)
servo_angle_tilt(tilt_servo, tilt)
time.sleep_ms(500)

state = 0
scan_pan = SCAN_START
scan_wait_cnt = 0
frame_count = 0
task_id = 2
t_last = time.ticks_ms()
last_cx = -1
last_cy = -1
lost_cnt = 0
confirm_cnt = 0
JUMP_THRESH = 150
HOLD_FRAMES = 15
CONFIRM_NEED = 5

while True:
    img = sensor.snapshot()
    frame_count += 1

    img_np = img.to_numpy_ref()
    gray_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    result, n_contours = find_and_check(gray_np, img_np)

    new_task = recv_task()
    if new_task is not None:
        task_id = new_task

    found = False
    cx = 0
    cy = 0
    if result:
        x, y, w, h = result
        cx = x + w // 2
        cy = y + h // 2
        found = True
        img.draw_rectangle(x, y, w, h, color=(0, 255, 0), thickness=3)
        draw_cross(img, cx, cy, size=25, color=(0, 0, 255), thickness=3)

    if state == 0:
        pan = 135
        tilt = 115
        servo_angle_pan(pan_servo, pan)
        servo_angle_tilt(tilt_servo, tilt)
        if found:
            state = 2
        else:
            state = 1
            scan_pan = SCAN_START
            scan_wait_cnt = 0

    elif state == 1:
        if found:
            state = 2
        else:
            scan_wait_cnt += 1
            if scan_wait_cnt >= SCAN_WAIT:
                scan_wait_cnt = 0
                scan_pan += SCAN_STEP
                if scan_pan > SCAN_END:
                    scan_pan = SCAN_START
                pan = scan_pan
                servo_angle_pan(pan_servo, pan)

    elif state == 2:
        if found:
            # 位置跳跃检查
            if last_cx > 0 and (abs(cx - last_cx) > JUMP_THRESH or abs(cy - last_cy) > JUMP_THRESH):
                found = False

        if found:
            confirm_cnt += 1
            if confirm_cnt >= CONFIRM_NEED:
                last_cx = cx
                last_cy = cy
                lost_cnt = 0
                err_x = cx - DETECT_W // 2
                err_y = cy - DETECT_H // 2
                if abs(err_x) > 30:
                    step = err_x * 0.02
                    if step > 2: step = 2
                    if step < -2: step = -2
                    pan = pan - step
                    pan = max(0, min(270, pan))
                    servo_angle_pan(pan_servo, pan)
                if abs(err_y) > 30:
                    step = err_y * 0.02
                    if step > 2: step = 2
                    if step < -2: step = -2
                    tilt = tilt + step
                    tilt = max(30, min(150, tilt))
                    servo_angle_tilt(tilt_servo, tilt)
            else:
                img.draw_rectangle(x, y, w, h, color=(255, 255, 0), thickness=1)
        else:
            confirm_cnt = 0
            lost_cnt += 1
            if lost_cnt > HOLD_FRAMES:
                state = 1
                scan_pan = SCAN_START
                scan_wait_cnt = 0

    Display.show_image(img, x=80, y=0)
    del img_np
    if frame_count % 50 == 0:
        gc.collect()

    if frame_count % 10 == 0:
        now = time.ticks_ms()
        fps = 10000 / max(1, time.ticks_diff(now, t_last))
        t_last = now
        if state == 2 and found:
            print("=> {:.1f}fps TRACK cx={} cy={} pan={:.0f} tilt={:.0f}".format(fps, cx, cy, pan, tilt))
            send_task(task_id)
        elif state == 1:
            print("=> {:.1f}fps SCAN pan={:.0f}".format(fps, scan_pan))
        else:
            print("=> {:.1f}fps INIT".format(fps))
