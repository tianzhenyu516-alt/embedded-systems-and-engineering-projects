# 导入必要的库
import sensor, time
from pyb import Pin
from pyb import Servo
from machine import UART
import math

#使用校准参数：——————————————————————————————————————————————————————————————————————————————————————————————————————————————
#第一，改成任务2，自动打靶程序，flag_ti = 2
flag_ti = 6  # 模式选择标志，默认为0，烧录程序与单片机通信需要改成0      #调试可以直接改到对应题目比如题目2，flag_ti = 2
flag_print_rect = 0   #标定模式改为1，非标定模式改为0

#第二，标定靶心正前方50cm的轨道上，标定矩形框的边
biaoding_50cm_rect_kuan = 83

#第三，标定靶心正前方50cm的轨道上，标定矩形框的边
jiguang_piancha_x = -9                        #放置在靶正前50CM，运行flag_ti = 2 任务二，打靶心，会出现中心点与激光点偏差，先调节jiguang_piancha_x再调节jiguang_piancha_y
jiguang_piancha_y = -22                       #调节可以正负，打到靶心就行

#使用校准参数——————————————————————————————————————————————————————————————————————————————————————————————————————————————


#调参：——————————————————————————————————————————————————————————————————————————————————————————————————————————————
# 第2 3题的打靶PID参数（可以根据实际情况调试）
pan_pid_params = (0.5, 0.02, 0)   # 水平 PID 参数
tilt_pid_params = (0.2, 0.02, 0)  # 垂直 PID 参数
# 第2 3题，静止时候去除KI积分，设为0
pan_pid_params1 = (0.3, 0, 1.0)   # 水平 PID 参数
tilt_pid_params1 = (0.1, 0, 1.0)  # 垂直 PID 参数

# 第3题的打靶PID参数（可以根据实际情况调试）
pan_pid_params_task3 = (0.5, 0.02, 1)   # 水平 PID 参数
tilt_pid_params_task3 = (0.2, 0.02, 1)  # 垂直 PID 参数

# 第6题的打靶PID参数（可以根据实际情况调试）
pan_pid_params_task6 = (0.4, 0.02, 0.1)   # 水平 PID 参数
tilt_pid_params_task6 = (0.2, 0.02, 0.1)  # 垂直 PID 参数

#调参：——————————————————————————————————————————————————————————————————————————————————————————————————————————————




# 初始化串口，波特率9600
uart = UART(3, 9600)  # 初始化 UART3，波特率 9600            #P5→TI的TX A21
clock = time.clock()


# 定义矩形四个顶点的初始坐标（QQVGA分辨率下）
points = [[12, 12], [108, 12], [108, 108], [12, 108]]

#激光继电器开关
jiguang_pin = Pin('P3', Pin.OUT_PP)                     #P3→继电器的IN口

pan_servo = Servo(1)  # 水平舵机（P7引脚）
tilt_servo = Servo(2)  # 垂直舵机（P8引脚）
# 校准舵机脉冲范围（单位：微秒）
pan_servo.calibration(500, 2500, 1500)  # 水平：500-2500μs，中位1500μs
#tilt_servo.calibration(500, 2500, 1500)  # 垂直：500-2500μs，中位1500μs
tilt_servo.calibration(1000, 2000, 1500)  # 垂直限位：1000-2000μs，中位1500μs

def set_servo_pulse(servo, pw, servo_id):
    """设置舵机脉宽并限幅，防止超出机械范围"""
    if servo_id == 'pan':
        pw = max(500, min(2500, pw))    # 水平：500-2500μs
    else:
        pw = max(1000, min(2000, pw))   # 垂直：1000-2000μs
    servo.pulse_width(int(pw))

def generate_r_points_on_circle(x, y, r, num):
    """
    生成均匀分布在圆上的点，并按顺时针顺序排序

    参数:
        x (float): 圆心的x坐标
        y (float): 圆心的y坐标
        r (float): 圆的半径
        num (int): 要生成的点的数量

    返回:
        list: 包含num个点的(x,y)坐标的列表，按顺时针顺序排序
    """
    r_points = []
    angle_step = 2 * math.pi / num  # 计算角度步长

    for i in range(num):
        # 计算当前点的角度
        theta = i * angle_step

        # 计算点在圆上的坐标
        point_x = x + r * math.cos(theta)
        point_y = y + r * math.sin(theta)

        r_points.append((point_x, point_y))

    # 按角度排序（从0开始顺时针方向）
    r_points.sort(key=lambda p: math.atan2(p[1] - y, p[0] - x) % (2 * math.pi))

    # 转换为整数坐标
    r_points = [(int(x), int(y)) for x, y in r_points]

    return r_points



def pid_control(error, pid_params, state):
    """
    :param error: 当前误差
    :param pid_params: (Kp, Ki, Kd)
    :param state: {'prev_error': 上一次误差, 'integral': 积分项累计}
    :return: PID 输出
    """
    Kp, Ki, Kd = pid_params
    state['integral'] += error
    state['integral'] = max(-1000, min(1000, state['integral']))  # 积分限幅
    derivative = error - state['prev_error']
    output = Kp * error + Ki * state['integral'] + Kd * derivative
    state['prev_error'] = error
    return output



# PID 状态（保存积分项和前一次误差）
pan_state = {'prev_error': 0, 'integral': 0}
tilt_state = {'prev_error': 0, 'integral': 0}


# jiguang_piancha_x6 = 10
# jiguang_piancha_y6 = 18
jiguang_piancha_x6 = jiguang_piancha_x
jiguang_piancha_y6 = jiguang_piancha_y



# 初始化摄像头
sensor.reset()
sensor.set_pixformat(sensor.RGB565)  # 设置彩色图像
sensor.set_framesize(sensor.QQVGA)   # 160x120分辨率
sensor.skip_frames(time = 500)       # 等待摄像头稳定
sensor.set_hmirror(True)
sensor.set_vflip(True)
# 主循环
while(True):
    clock.tick()
    img = sensor.snapshot()  # 获取图像

    # # 发送字节数据：[0xff, 0, 0, 0, 0, 0x0d]
    # output_bytes = bytearray([0xff, 1, 1, 1, 1, 0x0d])
    # uart.write(output_bytes)


    data = uart.read(6)  # 读取6个字节
    if data:
        print("收到数据：", data)
        # 判断长度为6并且数据格式正确
        if (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 1 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为1")
            flag_ti = 1
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 2 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为2")
            flag_ti = 2
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 3 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为3")
            flag_ti = 3
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 4 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为4")
            flag_ti = 4
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 5 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为5")
            flag_ti = 5
        elif (len(data) == 6 and
            data[0] == 0xff and
            data[5] == 0x0d and
            all(b == 6 for b in data[1:5])):
            print("✅ 接收到有效指令：中间四位全为6")
            flag_ti = 6
        # else:
        #     print("❌ 数据格式或内容不匹配")
    # else:
    #     print("未收到数据")



    if (flag_ti ==2 or flag_ti ==4 or flag_ti == 5):
        while True:
            clock.tick()
            img = sensor.snapshot()
            ambient_light = img.get_statistics().l_mean()
            rect_threshold = max(8000, min(15000, 20000 - ambient_light*100))
            # 查找图像中的矩形
            for r in img.find_rects(threshold = rect_threshold):
                # 粗略筛选矩形大小（排除过大或过小的矩形）
                bili = r[2]/r[3]
                #print("bili==",bili)
                if bili >1.5-0.6 and bili <1.5+0.1:
                    if flag_print_rect == 1:
                        print(r)
                    if(r[2] < 110 and r[3] < 70 and r[2] > 13 and r[3] > 10 ):
                        #print(r)
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

                        r_jiguang_piancha_x = int(jiguang_piancha_x/biaoding_50cm_rect_kuan*r[2])
                        r_jiguang_piancha_y = int(jiguang_piancha_y/biaoding_50cm_rect_kuan*r[2])
                        # print("zxypoints=",center_x-img.width() / 2,"   zxypoints=",center_y-img.height() / 2)
                        # 计算误差（当前点与图像中心的偏差）
                        pan_error = center_x - img.width() / 2 - r_jiguang_piancha_x  # 水平误差
                        tilt_error = center_y - img.height() / 2 - r_jiguang_piancha_y # 垂直误差

                        if pan_error > 5 :
                            flag_x = 0
                            jiguang_pin.low()    #关闭激光
                        elif pan_error < -5 :
                            flag_x = 0
                            jiguang_pin.low()
                        else:
                            flag_x = 1
                        if tilt_error > 5 :
                            flag_y = 0
                            jiguang_pin.low()
                        elif tilt_error < -5 :
                            flag_y = 0
                            jiguang_pin.low()
                        else:
                            flag_y = 1
                        if flag_x and flag_y:   #到达中心
                            jiguang_pin.high()  #打开激光
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params1, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params1, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            speed_1 = abs(int(pan_output))
                            speed_2 = abs(int(tilt_output))
                        else:
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            speed_1 = abs(int(pan_output))
                            speed_2 = abs(int(tilt_output))
                        set_servo_pulse(pan_servo, pan_servo.pulse_width() - pan_output, 'pan')
                        set_servo_pulse(tilt_servo, tilt_servo.pulse_width() + tilt_output, 'tilt')
                        # 调整舵机角度
                        if flag_print_rect == 0:
                            print(pan_error," --  ",tilt_error," --  ","Motor1: speed =", speed_1,"  Motor2: speed =", speed_2)
            break

    bos_num = 0
    if (flag_ti ==3):
        while True:
            if (flag_ti ==0):
                break
            bos = 0
            clock.tick()
            img = sensor.snapshot()
            ambient_light = img.get_statistics().l_mean()
            rect_threshold = max(8000, min(15000, 20000 - ambient_light*100))
            # 查找图像中的矩形
            for r in img.find_rects(threshold = rect_threshold):
                #print(r)
                # 粗略筛选矩形大小（排除过大或过小的矩形）
                bili = r[2]/r[3]
                print("bili==",bili)
                if bili >1.5-0.4 and bili <1.5+0.1:
                    if(r[2] < 110 and r[3] < 70 and r[2] > 13 and r[3] > 10 ):
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

                        r_jiguang_piancha_x = int(jiguang_piancha_x/biaoding_50cm_rect_kuan*r[2])
                        r_jiguang_piancha_y = int(jiguang_piancha_y/biaoding_50cm_rect_kuan*r[2])

                        pan_error = center_x - img.width() / 2 - r_jiguang_piancha_x  # 水平误差
                        tilt_error = center_y - img.height() / 2 - r_jiguang_piancha_y # 垂直误差

                        pan_output = pid_control(pan_error, pan_pid_params, pan_state)
                        tilt_output = pid_control(tilt_error, tilt_pid_params, tilt_state)

                        speed_1 = abs(int(pan_output))
                        speed_2 = abs(int(tilt_output))
                        if pan_error > 8 :
                            flag_x = 0
                            jiguang_pin.low()    #关闭激光
                        elif pan_error < -8 :
                            flag_x = 0
                            jiguang_pin.low()
                        else:
                            flag_x = 1
                        if tilt_error > 8 :
                            flag_y = 0
                            jiguang_pin.low()
                        elif tilt_error < -8 :
                            flag_y = 0
                            jiguang_pin.low()
                        else:
                            flag_y = 1
                        if flag_x and flag_y:   #到达中心

                            jiguang_pin.high()  #打开激光
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params1, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params1, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            speed_1 = 0
                            speed_2 = 0
                            flag_ti =0  #退出程序3
                            set_servo_pulse(pan_servo, pan_servo.pulse_width() + 10, 'pan')
                            break
                        else:
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params_task3, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params_task3, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            set_servo_pulse(pan_servo, pan_servo.pulse_width() - pan_output, 'pan')
                            set_servo_pulse(tilt_servo, tilt_servo.pulse_width() + tilt_output, 'tilt')
                        speed_1 = int(pan_output)
                        speed_2 = int(tilt_output)
                        print(pan_error," --  ",tilt_error," --  ","Motor1: speed =", speed_1,"  Motor2: speed =", speed_2)

            bos_num = bos_num + 1
            if bos_num >10:
                bos_num = 0
                if bos == 0:        #识别不到矩形框开始顺时针转动
                    print("+++++++++++++++++++")
                    set_servo_pulse(pan_servo, pan_servo.pulse_width() - 100, 'pan')


    if (flag_ti == 6):
        # 圆心在(jiguang_piancha_x,jiguang_piancha_y)，半径为5，生成8个点
        r_points = generate_r_points_on_circle(x = 0, y =0, r = 14, num = 4)
        for r_point in r_points:
            print(r_point)
        last_switch = time.ticks_ms()
        r_point_num = 0
        r_jiguang_piancha_x = r_points[r_point_num][0]
        r_jiguang_piancha_y = r_points[r_point_num][1]
        while True:
            now = time.ticks_ms()
            if time.ticks_diff(now, last_switch) > 100:
                last_switch = now
                print(r_point_num,"点：",r_points[r_point_num])
                r_jiguang_piancha_x = r_points[r_point_num][0]
                r_jiguang_piancha_y = r_points[r_point_num][1]
                r_point_num +=1
                if r_point_num >= len(r_points):
                    r_point_num = 0
                    break


            clock.tick()
            img = sensor.snapshot()
            ambient_light = img.get_statistics().l_mean()
            rect_threshold = max(8000, min(15000, 20000 - ambient_light*100))
            # 查找图像中的矩形
            for r in img.find_rects(threshold = rect_threshold):
                #print(r)
                # 粗略筛选矩形大小（排除过大或过小的矩形）
                bili = r[2]/r[3]
                #print("bili==",bili)
                if bili >1.5-0.6 and bili <1.5+0.1:
                    print(r)
                    if(r[2] < 100 and r[3] < 70 and r[2] > 13 and r[3] > 10 ):
                        #print(r)
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

                        d_jiguang_piancha_x = int(jiguang_piancha_x6/biaoding_50cm_rect_kuan*r[2])
                        d_jiguang_piancha_y = int(jiguang_piancha_y6/biaoding_50cm_rect_kuan*r[2])
                        d_r_jiguang_piancha_x = int(r_jiguang_piancha_x/biaoding_50cm_rect_kuan*r[2])
                        d_r_jiguang_piancha_y = int(r_jiguang_piancha_y/biaoding_50cm_rect_kuan*r[2])
                        # print("zxypoints=",center_x-img.width() / 2,"   zxypoints=",center_y-img.height() / 2)
                        # 计算误差（当前点与图像中心的偏差）
                        pan_error = center_x - img.width() / 2 - d_jiguang_piancha_x - d_r_jiguang_piancha_x # 水平误差
                        tilt_error = center_y - img.height() / 2 - d_jiguang_piancha_y - d_r_jiguang_piancha_y # 垂直误差


                        direction_1 = "cw"
                        direction_2 = "cw"
                        if pan_error > 1 :
                            flag_x = 0
                            direction_1 = "cw"
                            jiguang_pin.low()    #关闭激光
                        elif pan_error < -1 :
                            flag_x = 0
                            direction_1 = "ccw"
                            jiguang_pin.low()
                        else:
                            flag_x = 1
                        if tilt_error > 1 :
                            direction_2 = "ccw"
                            flag_y = 0
                            jiguang_pin.low()
                        elif tilt_error < -1 :
                            direction_2 = "cw"
                            flag_y = 0
                            jiguang_pin.low()
                        else:
                            flag_y = 1
                        if flag_x and flag_y:   #到达中心
                            jiguang_pin.high()  #打开激光
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params1, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params1, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            speed_1 = abs(int(pan_output))
                            speed_2 = abs(int(tilt_output))
                        else:
                            # 通过PID计算电机机调整量
                            pan_output = pid_control(pan_error, pan_pid_params_task6, pan_state)
                            tilt_output = pid_control(tilt_error, tilt_pid_params_task6, tilt_state)
                            # print("output:", pan_output, tilt_output)
                            speed_1 = abs(int(pan_output))
                            speed_2 = abs(int(tilt_output))
                        set_servo_pulse(pan_servo, pan_servo.pulse_width() - pan_output, 'pan')
                        set_servo_pulse(tilt_servo, tilt_servo.pulse_width() + tilt_output, 'tilt')
                        #print(pan_error," --  ",tilt_error," --  ","Motor1: speed =", speed_1, ", dir =", direction_1,"  Motor2: speed =", speed_2, ", dir =", direction_2)







