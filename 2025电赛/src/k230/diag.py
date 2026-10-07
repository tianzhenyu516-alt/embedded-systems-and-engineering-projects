"""
诊断：只看画面 + 打印亮度
把球放管子里和拿出来，对比亮度值变化
"""
import time, os, gc, cv2
import ulab.numpy as np
from media.sensor import *
from media.display import *
from media.media import *

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
print("[OK] camera on")

cnt = 0
while True:
    img = sensor.snapshot()
    if img is None:
        time.sleep_ms(5)
        continue
    img_np = img.to_numpy_ref()
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    
    h, w = gray.shape
    mid = h // 2
    row = gray[mid, :]
    
    mean_v = float(np.mean(row))
    max_v = 0
    max_x = 0
    for i in range(len(row)):
        if int(row[i]) > max_v:
            max_v = int(row[i])
            max_x = i
    
    img.draw_line(0, mid, w, mid, color=(255, 255, 0), thickness=1)
    Display.show_image(img, x=80, y=0)
    del img_np
    
    cnt += 1
    if cnt % 10 == 0:
        print("mean={:.0f} max={} at_x={}".format(mean_v, max_v, max_x))
    
    gc.collect()
