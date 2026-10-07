# 导入必要的库
import sensor, time
from pyb import Servo
from machine import UART
import time


# 初始化串口，波特率9600
uart = UART(3, 9600)  # 初始化 UART3，波特率 9600
clock = time.clock()
# 初始化舵机
pan_servo = Servo(1)  # 水平方向舵机
tilt_servo = Servo(2)  # 垂直方向舵机
# 舵机校准（脉冲宽度范围和中位值）
pan_servo.calibration(500, 2500, 1500)
tilt_servo.calibration(1000, 1800, 1400)

# 标志位初始化
flag_ti = 0  # 模式选择标志
flag_start = 0   # 开始执行标志

# 定义矩形四个顶点的初始坐标（QQVGA分辨率下）
points = [[12, 12], [108, 12], [108, 108], [12, 108]]



def pid_control(error, pid_params, state, output_limit=None):
    """
    :param error: 当前误差
    :param pid_params: (Kp, Ki, Kd)
    :param state: {'prev_error': 上一次误差, 'integral': 积分项累计}
    :param output_limit: (min_output, max_output) 输出限制范围，如 (-2, 2)
    :return: PID 输出
    """
    Kp, Ki, Kd = pid_params
    state['integral'] += error
    derivative = error - state['prev_error']
    output = Kp * error + Ki * state['integral'] + Kd * derivative
    state['prev_error'] = error

    if output_limit:
        min_output, max_output = output_limit
        output = max(min_output, min(output, max_output))  # 限幅处理

    return output

# PID参数（可以根据实际情况调试）
pan_pid_params = (0.98, 0, 1.0)   # 水平 PID 参数
tilt_pid_params = (1.0, 0, 1.0)  # 垂直 PID 参数

pan_pid_params2 = (0.5, 0, 1.0)   # 水平 PID 参数
tilt_pid_params2 = (0.4, 0, 0.7)  # 垂直 PID 参数

# PID 状态（保存积分项和前一次误差）
pan_state = {'prev_error': 0, 'integral': 0}
tilt_state = {'prev_error': 0, 'integral': 0}


jiguang_piancha_x = 8
jiguang_piancha_y = 8

# 初始化摄像头
sensor.reset()
sensor.set_pixformat(sensor.RGB565)  # 设置彩色图像
sensor.set_framesize(sensor.QQVGA)   # 160x120分辨率
sensor.skip_frames(time = 500)       # 等待摄像头稳定
#sensor.set_windowing((160, 120))     # 设置120x120的取景窗口
sensor.set_hmirror(True)
sensor.set_vflip(True)
# 主循环
while(True):
    clock.tick()
    img = sensor.snapshot()  # 获取图像




    # # 发送字节数据：[0xff, 0, 0, 0, 0, 0x0d]
    # output_bytes = bytearray([0xff, 1, 1, 1, 1, 0x0d])
    # uart.write(output_bytes)

    #time.sleep(0.1)  # 稍微等待一下，给对方设备时间响应

    data = uart.read(6)  # 读取7个字节
    if data:
        print("收到数据：", data)

        # 判断长度为7并且数据格式正确
        if (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 1 for b in data[1:5])):

            print("✅ 接收到有效指令：中间四位全为2")
            flag_ti = 1
        # 这里可以放入你的处理逻辑，例如启动某个功能
        # 判断长度为7并且数据格式正确
        if (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 2 for b in data[1:5])):

            print("✅ 接收到有效指令：中间四位全为2")
            flag_ti = 2
            # 这里可以放入你的处理逻辑，例如启动某个功能
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 3 for b in data[1:5])):

            print("✅ 接收到有效指令：中间四位全为3")
            flag_ti = 3
            # 这里可以放入你的处理逻辑，例如启动某个功能
        else:
            print("❌ 数据格式或内容不匹配")
    # else:
    #     print("未收到数据")



    if (flag_ti ==2):
        while True:
            clock.tick()
            img = sensor.snapshot()
            # 查找图像中的矩形
            for r in img.find_rects(threshold = 10000):
                #print(r)
                # 粗略筛选矩形大小（排除过大或过小的矩形）
                if(r[2] < 60 and r[3] < 60 and r[2] > 20 and r[3] > 20):
                    img.draw_rectangle(r.rect(), color = (255, 0, 0))  # 绘制矩形
                    # ===== 添加画中心点 =====
                    center_x = int((r.x() + r.x() + r.w()) / 2)
                    center_y = int((r.y() + r.y() + r.h()) / 2)
                    img.draw_circle(center_x, center_y, 3, color=(0, 0, 255))  # 用蓝色圆点标记中心
                    # =======================
                    i=0
                    # 获取并绘制四个顶点
                    for p in r.corners():
                        img.draw_circle(p[0], p[1], 2, color = (0, 255, 0))
                        # 存储顶点坐标（放大到QVGA）
                        points[3-i][0] = p[0]*2
                        points[3-i][1] = p[1]*2
                        i = i + 1

                    print("zxypoints=",center_x-img.width() / 2,"   zxypoints=",center_y-img.height() / 2)
                    # 计算误差（当前点与图像中心的偏差）
                    pan_error = center_x - img.width() / 2 -jiguang_piancha_x  # 水平误差
                    tilt_error = center_y - img.height() / 2 -jiguang_piancha_y # 垂直误差
                    print("error: ", pan_error, tilt_error)


                    # 通过PID计算舵机调整量
                    # 通过 PID 计算舵机调整量
                    pan_output = pid_control(pan_error, pan_pid_params, pan_state)
                    tilt_output = pid_control(tilt_error, tilt_pid_params, tilt_state)
                    print("output:", pan_output, tilt_output)

                    # 调整舵机角度
                    pan_servo.pulse_width(pan_servo.pulse_width() -  int(pan_output))  # 水平方向调整
                    tilt_servo.pulse_width(tilt_servo.pulse_width() -  int(tilt_output)) # 垂直方向调整
                    print("pan_servo.pulse_width()",pan_servo.pulse_width())


            break
    num = 0
    bos_num = 0
    dada = 0
    if (flag_ti ==3):
        while True:
            if (flag_ti ==0):
                break
            clock.tick()
            img = sensor.snapshot()
            # 查找图像中的矩形
            bos = 0

            for r in img.find_rects(threshold = 10000):
                #print(r)
                # 粗略筛选矩形大小（排除过大或过小的矩形）
                if(r[2] < 80 and r[3] < 80 and r[2] > 30 and r[3] > 30):
                    bos = 1
                    img.draw_rectangle(r.rect(), color = (255, 0, 0))  # 绘制矩形
                    # ===== 添加画中心点 =====
                    center_x = int((r.x() + r.x() + r.w()) / 2)
                    center_y = int((r.y() + r.y() + r.h()) / 2)
                    img.draw_circle(center_x, center_y, 3, color=(0, 0, 255))  # 用蓝色圆点标记中心
                    # =======================
                    i=0
                    # 获取并绘制四个顶点
                    for p in r.corners():
                        img.draw_circle(p[0], p[1], 2, color = (0, 255, 0))
                        # 存储顶点坐标（放大到QVGA）
                        points[3-i][0] = p[0]*2
                        points[3-i][1] = p[1]*2
                        i = i + 1

                    print("zxypoints=",center_x-img.width() / 2,"   zxypoints=",center_y-img.height() / 2)
                    # 计算误差（当前点与图像中心的偏差）
                    pan_error = center_x - img.width() / 2 - jiguang_piancha_x  # 水平误差
                    tilt_error = center_y - img.height() / 2 - jiguang_piancha_y # 垂直误差
                    print("error: ", pan_error, tilt_error)


                    # 通过PID计算舵机调整量
                    # 通过 PID 计算舵机调整量
                    pan_output = pid_control(pan_error, pan_pid_params2, pan_state)
                    tilt_output = pid_control(tilt_error, tilt_pid_params2, tilt_state)
                    print("output:", pan_output, tilt_output)

                    # 调整舵机角度
                    pan_servo.pulse_width(pan_servo.pulse_width() -  int(pan_output))  # 水平方向调整
                    tilt_servo.pulse_width(tilt_servo.pulse_width() -  int(tilt_output)) # 垂直方向调整
                    print("pan_servo.pulse_width()",pan_servo.pulse_width())
                    if abs(pan_error)<8 and abs(tilt_error)<8 :
                        dada == 1
                        flag_ti = 0
                        break
                else:
                    bos_num = bos_num + 1
                    if bos_num >30:
                        bos_num = 0
                        bos = 0
            if bos == 0 and dada == 0 :
                num = num +1
                pan_servo.angle(num)
                tilt_servo.angle(20)

                if num >100:
                    num = -80
                # pan_servo.pulse_width(pan_servo.pulse_width() -  100)  # 水平方向调整
                # time.sleep(0.4)


            #break


