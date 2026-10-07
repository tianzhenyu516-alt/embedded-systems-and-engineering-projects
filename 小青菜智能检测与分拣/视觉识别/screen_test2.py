from media.sensor import *
from media.display import *
from media.media import *
import time, os

print("=== 屏幕测试程序 v2 ===")

try:
    print("1. 初始化 Sensor...")
    sensor = Sensor()
    sensor.reset()
    print("   Sensor reset OK")
    
    print("2. 设置分辨率...")
    sensor.set_framesize(width=640, height=480, chn=CAM_CHN_ID_0)
    sensor.set_pixformat(Sensor.RGB565, chn=CAM_CHN_ID_0)
    print("   Resolution set OK")
    
    print("3. 初始化 Display...")
    Display.init(Display.ST7701, width=800, height=480, to_ide=True)
    print("   Display init OK")
    
    print("4. 初始化 MediaManager...")
    MediaManager.init()
    print("   MediaManager init OK")
    
    print("5. 启动 Sensor...")
    sensor.run()
    print("   Sensor run OK")
    
    print("=== 所有初始化完成，开始显示 ===")
    
    clock = time.clock()
    frame_count = 0
    
    while True:
        os.exitpoint()
        clock.tick()
        
        img = sensor.snapshot(chn=CAM_CHN_ID_0)
        frame_count += 1
        
        fps = clock.fps()
        
        # 绘制测试图形
        img.draw_rectangle(50, 50, 100, 100, color=(255, 0, 0), thickness=3)
        img.draw_circle(320, 240, 50, color=(0, 255, 0), thickness=2)
        img.draw_line(0, 0, 640, 480, color=(0, 0, 255), thickness=2)
        
        # 尝试不同的显示方式
        try:
            Display.show_image(img)
            print("Frame {} displayed".format(frame_count))
        except Exception as e:
            print("Display error:", e)
        
        if frame_count >= 100:
            break
            
        time.sleep_ms(30)
            
except KeyboardInterrupt as e:
    print("用户停止:", e)
except Exception as e:
    print("错误:", type(e).__name__, str(e))
finally:
    print("清理资源...")
    try:
        sensor.stop()
    except:
        pass
    try:
        Display.deinit()
    except:
        pass
    try:
        MediaManager.deinit()
    except:
        pass
    print("测试结束，共显示 {} 帧".format(frame_count))
