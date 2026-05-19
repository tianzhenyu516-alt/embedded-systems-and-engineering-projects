from media.sensor import *
from media.display import *
from media.media import *
from machine import PWM, FPIOA, Pin
import time, os

# ========== GPIO4 信号输出 (接STM32 A4口) ==========
signal_pin = Pin(4, Pin.OUT, pull=Pin.PULL_DOWN)
signal_pin.value(0)

# ========== 舵机 ==========
pwm_io = FPIOA()
pwm_io.set_function(47, FPIOA.PWM3)
servo = PWM(3, freq=50, duty=0)

# 角度控制: 0-270度 -> 500-2500us
def servo_angle(angle):
    if angle < 0:
        angle = 0
    if angle > 270:
        angle = 270
    pulse_us = int(500 + (angle / 270.0) * 2000)
    duty = int(pulse_us / 20000.0 * 65535)
    servo.duty_u16(duty)

# ========== 主程序 ==========
print("黄叶识别 - 极速检测")

sensor = Sensor()
sensor.reset()
sensor.set_framesize(width=640, height=480, chn=CAM_CHN_ID_0)
sensor.set_pixformat(Sensor.RGB565, chn=CAM_CHN_ID_0)
Display.init(Display.ST7701, width=800, height=480, to_ide=True)
MediaManager.init()
sensor.run()

# 平衡黄色阈值 - 准确度和速度兼顾
yellow_threshold = [(50, 95, -15, 8, 35, 80)]

servo_angle(0)

detected_frames = 0
state = "SCAN"
state_start = 0

print("初始: 0度, GPIO4=LOW")

try:
    while True:
        img = sensor.snapshot(chn=CAM_CHN_ID_0)
        
        # 极速检测 - 最低阈值
        blobs = img.find_blobs(yellow_threshold, 
                               pixels_threshold=80, 
                               area_threshold=150, 
                               merge=True, 
                               margin=3)
        
        best_blob = None
        best_score = 0
        
        for b in blobs:
            w, h = b.w(), b.h()
            if w < 12 or h < 12:
                continue
            ratio = max(w, h) / min(w, h)
            if ratio < 1.2:
                continue
            
            cx, cy = b.cx(), b.cy()
            try:
                r, g, b_val = img.get_pixel(cx, cy)[:3]
                # 平衡黄色标准
                green_ratio = (g - r) / r if r > 0 else 0
                if not (green_ratio <= 0.08 and g > b_val * 1.4 and r > 45 and g > 50):
                    continue
            except:
                continue
            
            if b.pixels() > best_score:
                best_score = b.pixels()
                best_blob = b
        
        detected = best_blob is not None
        
        if detected:
            img.draw_rectangle(best_blob.rect(), color=(0, 255, 0), thickness=3)
            img.draw_cross(best_blob.cx(), best_blob.cy(), color=(255, 0, 0), size=12, thickness=2)
            if state == "SCAN":
                detected_frames += 1
        else:
            if state == "SCAN":
                detected_frames = 0
        
        now = time.ticks_ms()
        
        # 3帧极速确认
        if state == "SCAN" and detected_frames >= 3:
            print(">>> 3帧确认! GPIO4=HIGH")
            signal_pin.value(1)
            state_start = now
            state = "SIGNAL"
        
        elif state == "SIGNAL":
            elapsed = time.ticks_diff(now, state_start)
            if elapsed >= 1000:  # 等1秒
                print(">>> 转270度!")
                servo_angle(270)
                state_start = now
                state = "PUSHING"
        
        elif state == "PUSHING":
            elapsed = time.ticks_diff(now, state_start)
            if elapsed >= 1500:  # 保持1.5秒
                print(">>> 转回0度!")
                servo_angle(0)
                state_start = now
                state = "WAIT_RETURN"
        
        elif state == "WAIT_RETURN":
            elapsed = time.ticks_diff(now, state_start)
            if elapsed >= 1000:  # 等1秒
                print(">>> GPIO4=LOW, 完成!")
                signal_pin.value(0)
                state = "DONE"
        
        elif state == "DONE":
            detected_frames = 0
            state = "SCAN"
            print(">>> 准备下一次")
        
        # 显示
        if state == "SCAN":
            if detected_frames > 0:
                status_text = "D:{}/3".format(detected_frames)
            else:
                status_text = "SCAN"
        elif state == "SIGNAL":
            status_text = "STOP"
            img.draw_string_advanced(200, 200, 40, "STOP!", color=(255, 255, 0))
        elif state == "PUSHING":
            status_text = "PUSH"
            img.draw_string_advanced(200, 200, 50, "PUSH!", color=(255, 0, 0))
        elif state == "WAIT_RETURN":
            status_text = "WAIT"
            img.draw_string_advanced(200, 200, 40, "WAIT", color=(0, 255, 255))
        else:
            status_text = "DONE"
        
        img.draw_string_advanced(5, 5, 20, status_text, color=(255, 255, 255))
        Display.show_image(img, x=80, y=0)
        
except KeyboardInterrupt:
    print("停止")
finally:
    signal_pin.value(0)
    servo_angle(0)
    sensor.stop()
    Display.deinit()
    MediaManager.deinit()
