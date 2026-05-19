from media.sensor import *
from media.display import *
from media.media import *
import time, os

print("=== 屏幕测试程序 ===")

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
        
        img.draw_string_advanced(10, 10, 32, "TEST FPS:{:.1f}".format(fps), color=(255, 255, 255))
        img.draw_string_advanced(10, 50, 32, "Frame:{}".format(frame_count), color=(0, 255, 0))
        img.draw_rectangle(100, 100, 200, 150, color=(255, 0, 0), thickness=3)
        
        Display.show_image(img, x=80, y=0)
        
        if frame_count % 30 == 0:
            print("Running... FPS:{:.1f} Frame:{}".format(fps, frame_count))
            
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
    print("测试结束")
