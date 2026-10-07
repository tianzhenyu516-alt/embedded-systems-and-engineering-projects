import sensor, time, image,math
from pid import PID
from pyb import UART,Pin,Timer,LED
from ubluetooth import CARSTATE,UBLUETOOTH
from umotor import UMOTOR
from pid import PID
from ultrasonic import ULTRASONIC
from linetraking import LINETYPE,LINETRAKING
#底部采用270度舵机，可具有更大的旋转角度
#270度舵机和180度换算关系
#A/180=B/270，那么270度对应90度位置是，90/270*180=60
###################################用户调整参数start############################################
pan_servo_start=180      #左右舵机初始位置，正前方
dis_servo_start=90      #前后舵机初始位置，让机械臂保持垂直
tilt_servo_start=120     #上下舵机初始位置
pan_angle=pan_servo_start    #左右运动控制，设置一个初始角度
dis_angle=dis_servo_start    #前后运动初始角度
tilt_angle=tilt_servo_start   #上下舵运动控制，初始角度
target_title_angle=155  #目标抓取位置，即上下控制舵机极限位置，避免向下运动太多导致舵机卡主。
servo_start_angle=(pan_servo_start,dis_servo_start,tilt_servo_start)
DIS_RATE=27500          #测距离系数，使用图像像素多少估算距离
global flag_lost
flag_lost=0             #用于确认是否达到了可抓取的位置，一般确认多次已保证准确性
count=0

#小车运动PID
ran_pid  = PID(p=0.9, i=0.01) #小车前后追球PID
len_pid  = PID(p=0.9 ,i=0.01) #小车左右追踪pid
#舵机PID
pan_pid = PID(p=0.01, i=0, imax=90) #左右PID，对应S1
tilt_pid = PID(p=0.03, i=0, imax=90) #上下PID，对应S3
dis_pid = PID(p=0.01, i=0, imax=90)#前后PID，对应S2

#外部传感器，电机控制，超声波避障，串口蓝牙初始化
global ultradis,carstate,cardir,left_speed,right_speed,img,THRESHOLD
ultradis=0.0
motor=UMOTOR()
ble=UBLUETOOTH(uart_port=1,baudrate=9600)
ultrawave = ULTRASONIC(trig_pin="B15",echo_pin="B10")

objects = list()
last_objects=objects
global key_state,key_event
key_state=0
key_event=0
key = Pin('D8', Pin.IN, Pin.PULL_UP)
# 颜色跟踪阈值(L Min, L Max, A Min, A Max, B Min, B Max)
global THRESHOLD
THRESHOLD  = [(43, 85, -31, 55, 27, 84)]
yellow_threshold= [ (58, 86, 7, 53, 33, 80),(22, 50, 21, 55, 37, 66)]
red_threshold = [(38, 65, 54, 109, 34, 107)]#红色
blue_threshold = [(10, 46, -26, 63, -82, -7)]#蓝色
############################电机驱动部分############################
# Untitled - By: mengfan_zheng - 周日 5月 8 2022
# 生成50HZ方波，使用TIM3，channels 1,2
#控制舵机需要输出2.5%-12.5%的PWM
#0度----0.5/20*100=2.5;(要看实际的舵机是否支持0度，一般运动不到0度，需要把这个值调大一点)
#45度----1.0/20*100=5;
#90度----1.5/20*100=7.5;
#135度----2.0/20*100=10;
#180度----2.5/20*100=12.5;
# 生成50HZ方波
#控制舵机需要输出2.5%-12.5%的PWM
#S1控制左右，S2控制前后，S3控制上下，S4控制抓取
time3 = Timer(3, freq=50) # Frequency in 50Hz(20ms)
time2    = Timer(2, freq=50) # Frequency in 50Hz(20ms)
time12   = Timer(12, freq=50) # Frequency in 50Hz(20ms)

S1=time2.channel(2, Timer.PWM, pin=Pin("A1"), pulse_width_percent=7.5)   #初始角度90度
S2=time2.channel(4, Timer.PWM, pin=Pin("B11"), pulse_width_percent=7.5)  #初始角度90度
S3=time2.channel(1, Timer.PWM, pin=Pin("A0"), pulse_width_percent=7.5)   #初始角度90度
S4=time12.channel(1, Timer.PWM, pin=Pin("B14"), pulse_width_percent=7.5)   #初始角度90度


pan_pid = PID(p=0.03, i=0, imax=90) #左右PID，对应S1
tilt_pid = PID(p=0.03, i=0, imax=90) #上下PID，对应S3
dis_pid = PID(p=0.01, i=0, imax=90)#前后PID，对应S2

#global pan_angle,tilt_angle,dis_angle,count
global ARM_LENGHT,angle_start
####################机械臂关键参数start，用户需根据实际情况调整###################
#舵机安装误差角度，安装时不可能完全在对应中位，因此存在误差角，计算时需要做补偿
#90度位置偏差，可正可负
S1_offset=-6   #底部舵机偏置角 >0 往右，<0往左
S2_offset=-5  #前后运动舵机偏置角>0 往前，<0往后
S3_offset=3  #上下运动运动舵机偏置角 >0 往下，<0往上
DIS_offset=30 #测距偏移值
ARM_LENGHT=(103,150,145) #机械臂臂长定义mm，四自由度机械臂有三个臂长
####################机械臂关键参数end，用户需根据实际情况调整###################
CLAW_RELEASE=30 #爪子释放角度
CLAW_CATCH=165 #爪子合拢角度
count=0
color_num=0


#功能： 切换像素格式，颜色识别用彩色，人脸跟随，寻迹用灰度图
#输入： img，s_flag切换标志
#输出： 无
def sensor_judeg_mode(img,s_flag):
    if  s_flag==1:  #寻迹，灰度图
        s_flag=0
        sensor.set_pixformat(sensor.GRAYSCALE) # use 灰度图像，通过窗口控制摄像头距离黑线的距离
        sensor.set_framesize(sensor.QVGA)
        sensor.set_windowing((160,120))
        img = sensor.snapshot()
    elif s_flag==2 or s_flag==3 : #颜色识别跟随，避障
        sensor.set_pixformat(sensor.RGB565) # use RGB565.彩色图像
        sensor.set_framesize(sensor.QVGA)
        sensor.set_windowing((320,240))
        img = sensor.snapshot()
        s_flag=0

#计算目标空间位置
#pan_angle左右运动角度,tilt_angle上下运行角度,real_w目标距离误差补偿
def calculate_object_xy(pan_angle,tilt_angle,real_w):
    #ser_x=80
    ser_h=45
    LY=0
    LX=0
    Len=0
    degrex=math.radians(pan_angle-90)
    degree=math.radians(180-tilt_angle)
    s1=ser_h/math.sin(degree)
    Len=(ARM_LENGHT[0]+ARM_LENGHT[1]+s1-real_w)*math.tan(degree)
    Len=int(Len)
    LX=int(Len*math.cos(degrex))
    LY=int(Len*math.sin(degrex))
    print("LX:",LX)
    print("LY:",LY)
    return LX,LY

#PWM控制舵机运动角度
#输入：舵机运动到目标角度
#输出：无
def servo_angle(servo_n,s_angle,soffset=0):
    angle=soffset+s_angle
    if angle<=0:
        angle=0
    if angle>=180:
        angle=180
    percent=(angle+45)/18
    servo_n.pulse_width_percent(percent)
#定义舵机运动
#输入：舵机运动的起止角度,舵机基础偏置角度（安装偏置）
#输出：无
def servo_move(servo_n,start_angle,end_angle,soffset):
    if start_angle>=end_angle :
        while (start_angle>=end_angle) :
            servo_angle(servo_n,start_angle,soffset)
            time.sleep(30)
            start_angle=start_angle-2
        return
    if start_angle<=end_angle :
        while (start_angle<=end_angle) :
            servo_angle(servo_n,start_angle,soffset)
            time.sleep(30)
            start_angle=start_angle+2
        return

#机械臂从坐标位置回到起始位置
def machineArm_move_to_start(arm_angle):
    global pan_angle,tilt_angle,dis_angle
    time.sleep(1000)
    servo_move(S2,arm_angle[1],servo_start_angle[1],S2_offset)
    servo_move(S1,arm_angle[0],servo_start_angle[0],S1_offset)
    servo_move(S3,arm_angle[2],servo_start_angle[2],S3_offset)
    time.sleep(1000)
    pan_angle=servo_start_angle[0]    #左右运动控制，回到初始角度
    dis_angle=servo_start_angle[1]    #前后运动初始角度
    tilt_angle=servo_start_angle[2]   #上下舵运动控制，初始角度

#机械臂从起始位置运动到坐标位置（x,y,z）
def machineArm_move_to_coordinate(angle_start,arm_angle):
    time.sleep(1000)
    servo_move(S3,angle_start[2],arm_angle[2],S3_offset)
    time.sleep(1000)
    servo_move(S2,angle_start[1],arm_angle[1],S2_offset)
    time.sleep(1000)
    servo_move(S1,angle_start[0],arm_angle[0]+90,S1_offset) #底部舵机需要加上中心偏移90度
    time.sleep(1000)

#机械臂运动到放置点
def machineArm_move_to_dest(angle_start,arm_angle):
    time.sleep(1000)
    servo_move(S2,angle_start[1],90,S2_offset)
    time.sleep(1000)
    servo_move(S1,angle_start[0],90,S1_offset)
    time.sleep(1000)
    servo_move(S1,90,arm_angle[0],S1_offset)
    servo_move(S3,angle_start[2],arm_angle[2],S3_offset)
    servo_move(S2,90,arm_angle[1],S2_offset)
    time.sleep(1000)

#功能： 寻找最大的目标，计算方式为像素面积排序
#输入： 链表objects，坐标X,坐标y,像素宽,像素高
#输出： 最大目标元组
def find_max_object(objects):
    max_size=0
    max_object=None
    for object in objects:
        if object[2]*object[3] > max_size:
            max_object=object
            max_size = object[2]*object[3]
    return max_object

#函数功能：自动避障，延时策略很关键
#输入：目标距离 单位：cm
#输出：无
def auto_avoidance(objdis):
    car_speed=70
    if(objdis>= 30):
        motor.run(car_speed,car_speed)      #前进
        time.sleep(100) #前进时间不能长，否则正前方行驶容易一直前进后退
    if objdis<=20 and (objdis>2.0):
        motor.run(-car_speed,-car_speed)    #后退
        time.sleep(600)
    if objdis< 30 and (objdis>20):    #右转
        motor.run(car_speed,-car_speed)
        time.sleep(1500)#转弯时间要稍微长一点，特别是墙角位置转时间短了不容易过去

#假设距离变化每次控制在30左右，用来控制速度快慢
s_last=0
s_lowpower=0
#速度控制，主要用来控制速度变化快慢，达到匀速效果
def speed_error_control(ball_s,power,high_s,low_s):
    global s_last
    power_s=power
    s_error=s_last-ball_s            #计算两次距离变化，前进时距离在接近
    s_last=ball_s                    #更新s_last
    if s_error>= high_s :            #变化太快
        power_s=power_s-s_error      #对power进行修正
    if abs(s_error)<low_s:           #变化太慢或基本没有变化
        power_s=power_s+5            #对power进行修正
    return power_s

tracing_serangle_pan=60 #横向舵机角度270度舵机
tracing_serangle_tilt=60 #纵向舵机角度，调节视野
car_speed=70  #电机目标速度
rho_pid = PID(p=1.2, i=0.5)
theta_pid = PID(p=0.6, i=0.2)

trace=LINETRAKING()
is_debug = True
led=LED(1)
# 直线灰度图颜色阈值
THRESHOLD_BLOB_SIZE = (160,10,120,10) #轨迹宽高值限制
flag_trace=0
def tracingline_auto_control(img):
    global flag_trace
    # 每个roi为(x, y, w, h)，线检测算法将尝试找到每个roi中最大的blob的质心。
    # 然后用不同的权重对质心的x位置求平均值，其中最大的权重分配给靠近图像底部的roi，
    # 较小的权重分配给下一个roi，以此类推。
    rho_err=0
    theta_err= 0
    THRESHOLD_LINEE = [(4, 96)]
    line_reslut=0
    servo_angle(S1,servo_start_angle[0])
    servo_angle(S2,servo_start_angle[1])
    servo_angle(S3,servo_start_angle[2])
    #pan_servo.angle(tracing_serangle_pan,1000)
    #tilt_servo.angle(tracing_serangle_tilt,1000)
    line_reslut=trace.find_line_trace(img,THRESHOLD_LINEE,THRESHOLD_BLOB_SIZE,is_debug)
    if line_reslut>0:
        if (trace.line_type==LINETYPE.isSTRAIGHT) or (trace.line_type==LINETYPE.isTURNRIGHT) or (trace.line_type==LINETYPE.isTURNLEFT) :
            theta_err=trace.line_xtheta
            rho_err=trace.line_xerro
            rho_output=0
            theta_output=0
            output=0
            flag_trace=0
           # 根据偏角和中线距离差PID控制小车运转
            if (rho_err>-80) and (theta_err>-44.9):
                rho_output = rho_pid.get_pid(rho_err,1)
                theta_output = theta_pid.get_pid(theta_err,1)
                output = rho_output+theta_output
                print("output",output)
                motor.run(car_speed+output, car_speed-output)
            else:
               motor.run(0,0)
               pass
        if (trace.line_type==LINETYPE.isTJUNCTION) or (trace.line_type==LINETYPE.isCROSSTYPE) :
            motor.run(0,0)
            led.on()
            time.sleep(500)
            led.off()
            time.sleep(500)
            flag_trace=flag_trace+1
            if flag_trace>=3:
                flag_trace=0
                time.sleep(1000)
                motor.run(0,0)


#功能： 追踪动作
#输入： 图像，小球距离,最大面积的小球元组
#输出： 无
#############################小车追踪############################
def traking_ball(ball_s,title_angle,target_title_angle,pan_error):
    global count
    if ((ball_s>300) and (ball_s<2000)) and (title_angle<target_title_angle):
        count=0
        power_s=0
        power_l=0
        #前进与后退控制，
        #没有做后退，而是采用先大致接近目标，再修订距离得方式
        #前进与后退控制，这里采用的是像素面积计算距离，而抓取采用的是距离参数，
        #两者可以统一一下，具体可以根据实际物体大小测定后调整
        #小车速度控制在一定范围，保持低速运动抓取成功率高，根据路面不同调整速度范围
        if ball_s>500 and ball_s<=2000:
            dis_error=ball_s-500
            power_s=int(ran_pid.get_pid(dis_error,1)/2)
        elif ball_s>300 and ball_s<=500:
            dis_error=ball_s-300
            power_s=int(ran_pid.get_pid(dis_error,1)/2)
            #电机PWM限幅，防止最后一点距离走不到
        else:
            power_s =40
        power_s=speed_error_control(ball_s,power_s,25,10)
        print("power_s:",power_s)
        if(power_s>80):
            power_s=80
        if(power_s<30):
            power_s=30
        power_l=int(len_pid.get_pid(pan_error,1))
        #print("power_s:",power_s)
        #print("power_l:",power_l)
        motor.run(power_s-power_l,power_s+power_l)

#功能： 小球颜色识别
#输入： 图像
#输出： ball_s,max_blob
def three_color_detect(img):
    #全局变量
    max_blob=None
    color_num=0
    blobs0 = img.find_blobs(yellow_threshold,pixels_threshold=100,merge=False)
    if blobs0:
        max_blob = find_max_object(blobs0)
        if max_blob:    color_num=1
    else :
        blobs1 = img.find_blobs(red_threshold,pixels_threshold=100,merge=False)
        if blobs1:
            max_blob = find_max_object(blobs1)
            if max_blob:    color_num=2
        else :
            blobs2 = img.find_blobs(blue_threshold,pixels_threshold=100,merge=False)
            if blobs2:
                max_blob = find_max_object(blobs2)
                if max_blob:    color_num=3
    return color_num,max_blob
#功能： 小球颜色识别
#输入： 图像
#输出： ball_s,max_blob
def color_ball_detect(img):
    #全局变量
    global last_objects,objects,flag_lost
    THRESHOLD  =[ (58, 86, 7, 53, 33, 80),(22, 50, 21, 55, 37, 66)]
    ball_s=0
    max_blob=None
    if last_objects:  #如果上一张图像中找到了色块，就在色块周边扩展，然后在扩展后的ROI区域进行寻找色块，这样有利于追踪
         for b in objects:
            x1 = b[0]-12
            y1 = b[1]-12
            w1 = b[2]+21
            h1 = b[3]+21
         roi2 = (x1,y1,w1,h1)
         objects = img.find_blobs(THRESHOLD,roi = roi2,area_threshold=100,merge=True)
    else:       #如果没有找到色块，就重新计算全图的色块，并将全图色块信息保存到上一张图像上，这样下一次就可以再进行ROI区域寻找色块
        objects = img.find_blobs(THRESHOLD,area_threshold=100,merge=True)
    #step1 有目标，就进行追踪和抓取操作
    if objects:  #如果找到了色块，就计算最大的色块位置，并做舵机追踪
        flag_lost=0
        ball_s=0
        max_blob = find_max_object(objects)
        last_objects = max_blob
        #色块的位置和大小需要满足图像本身大小的要求，以免越界
        ball_s=DIS_RATE/(max_blob[2]*2) #计算距离
        img.draw_rectangle(max_blob.rect())
        cx=int(max_blob[0]+max_blob[2]/2)
        cy=int(max_blob[1]+max_blob[3]/2)
        img.draw_cross(cx, cy) # cx, cy画中心点
        img.draw_string(cx,cy, "%.2f mm"%(ball_s))  #显示目标的距离参数
    else:   last_objects = None
    return ball_s,max_blob

#功能： 抓取动作
#输入： 小球距离,最大面积的小球元组
#输出： 无
def catch_ball(pan_angle,title_angle,pan_error,tilt_error):
    global count,angle_start,color_num
    color_num=1
    cor_dst=[(-210,0,120),(-175,0,120),(-140,0,120)]
    if(abs(tilt_error)<=10 and abs(pan_error)<=10):
        count=count+1
        if(count>=5):
            count=0
            Lxy=calculate_object_xy(pan_angle,tilt_angle,DIS_offset)
            if Lxy[1]>=150 and Lxy[1]<=300 :#选取合适的抓取范围，由于机械臂运动范围有限制，这个距离抓取准确率比较高
                arm_angle=image.calculate_machine_hand(coordinate=(Lxy[0],Lxy[1],10),armlength=ARM_LENGHT)#抓取位置高度Z坐标为目标大小的1/2
                print("arm_angle",arm_angle)
                if (arm_angle[1]+arm_angle[2])==0 or arm_angle[2]>160:
                    print("arm_angle can not reach")
                    arm_angle=(arm_angle[0],180,30)#机械臂到达不了的位置,设置一个默认角度
                angle_start=(pan_angle,dis_angle,tilt_angle)
                machineArm_move_to_coordinate(angle_start,arm_angle)
                servo_angle(S4,CLAW_CATCH) #抓取
                #这里没有区分不同色块放置位置，可以根据color_num值计算不同放置位置，即可将不同色块放置在不同位置
                print("cor_dst:",cor_dst)
                arm_angle1=image.calculate_machine_hand(coordinate=cor_dst[color_num-1],armlength=ARM_LENGHT)
                print("arm_angle1",arm_angle1)
                machineArm_move_to_dest(arm_angle,arm_angle1)
                servo_angle(S4,CLAW_RELEASE) #释放
                machineArm_move_to_start(arm_angle1)#回到初始位置
                time.sleep(1000)
                motor.run(-70,-70) #后退
                time.sleep(2000)
                motor.run(0,0)
    else:count=0
#功能： 自动找球控制
#输入： 图像，小球距离,最大面积的小球元组
#输出： 无
def find_ball_auto_control(img,mode=0):
    global flag_lost
    global pan_angle,tilt_angle,dis_angle,count,angle_start
    angle_start=(0,0,0,0)
    ball_s=0
    ball_s,max_blob=color_ball_detect(img)
    if max_blob:
        #色块的位置和大小需要满足图像本身大小的要求，以免越界
        if  max_blob.cx()>0 and max_blob.cx()<img.width() and max_blob.cy()>0 and max_blob.cy()<img.height() :
            print("ball_s:",ball_s)
            pan_error =img.width()/2-max_blob.cx()   #左右控制的偏差
            tilt_error =img.height()/2-max_blob.cy() #上下控制的偏差
            tilt_output=tilt_pid.get_pid(tilt_error,1)/2  #计算PID参数
            tilt_angle=tilt_angle-tilt_output
            if(tilt_angle>=160):tilt_angle=160#机械臂运动有位置限制防止卡舵机，需要做限制角度
            if ((ball_s>300) and (ball_s<2000)) and (tilt_angle<target_title_angle):
                servo_angle(S3,tilt_angle,S3_offset)
                traking_ball(ball_s,tilt_angle,target_title_angle,pan_error)
            if ((ball_s>=200) and (ball_s<300)) or (tilt_angle>=target_title_angle):
                motor.run(0,0) #停止小车追踪
                pan_output=pan_pid.get_pid(pan_error,1)/2   #计算PID参数
                pan_angle=pan_angle+pan_output
                servo_angle(S1,pan_angle,S1_offset)#左右舵机调整位置
                #pan_angle=180#底部舵机固定，由小车左右追踪
                servo_angle(S3,tilt_angle,S3_offset)#上下舵机追踪调整位置
                catch_ball(pan_angle,tilt_angle,pan_error,tilt_error)
            if (ball_s>=100) and (ball_s<200):
                motor.run(-70,-70) #没到合适抓取位置后退
                time.sleep(1000)
                motor.run(0,0)
                servo_angle(S1,pan_servo_start,S1_offset)    #0-180是从左往右运动，减小往左运动，增大往右运动
                servo_angle(S2,dis_servo_start,S2_offset)    #0-180是从后到前运动，减小时向后运动，增大向前运动
                servo_angle(S3,tilt_servo_start,S3_offset)    #0-180是从上到下运动，减小时向上运动，增大向下运动
                servo_angle(S4,CLAW_RELEASE)
    else : #没有找到目标
        flag_lost=flag_lost+1
        if mode>0 : #避障模式下才采集超声波数据，否则不不接超声波这里采集数据会很慢
            ultradis=ultrawave.get_distance()
            #print("auto avoidance:%s"%ultradis)
        if flag_lost>10:#连续10帧没有
            flag_lost=0
            servo_angle(S1,pan_servo_start,S1_offset)    #0-180是从左往右运动，减小往左运动，增大往右运动
            servo_angle(S2,dis_servo_start,S2_offset)    #0-180是从后到前运动，减小时向后运动，增大向前运动
            servo_angle(S3,tilt_servo_start,S3_offset)    #0-180是从上到下运动，减小时向上运动，增大向下运动
            servo_angle(S4,CLAW_RELEASE)
            pan_angle,dis_angle,tilt_angle=pan_servo_start,dis_servo_start,tilt_servo_start
            if mode>0 :
                #step4 没有找到目标就进行超声波避障前进
                auto_avoidance(ultradis)
            else:
                motor.run(0,0) #停止等待目标出现
                #tilt_servo.angle(tilt_servo_start)
                #motor.run(70,-70) #原地旋转找球
                #time.sleep(500) #旋转找球每次等一会

def car_state_deal(img):
    global dis_angle,tilt_angle,pan_angle
    carstate,cardir,left_speed,right_speed,s_flag=ble.bluetooth_deal()
    sensor_judeg_mode(img,s_flag)
    if (carstate==CARSTATE.enMANUAL): #手动控制小车
        motor.run(left_speed,right_speed)
    elif (carstate==CARSTATE.enFLITING or carstate==CARSTATE.enSTRAKING): #控制舵机
        if(cardir==CARSTATE.enRUN):  #舵机向上
            dis_angle=dis_angle-2
            tilt_angle=tilt_servo_start
            servo_angle(S2,dis_angle)
            servo_angle(S3,tilt_angle)
        elif(cardir==CARSTATE.enBACK): #舵机向下
            dis_angle=dis_angle+2
            tilt_angle=tilt_servo_start
            servo_angle(S2,dis_angle)
            servo_angle(S3,tilt_angle)
        elif(cardir==CARSTATE.enLEFT): #舵机向左
            pan_angle=pan_angle-2
            servo_angle(S1,pan_angle)
        elif(cardir==CARSTATE.enRIGHT):#舵机向右
            pan_angle=pan_angle-2
            servo_angle(S1,pan_angle)
        elif(cardir==CARSTATE.enRELEASE):
            servo_angle(S4,CLAW_RELEASE) #释放
        elif(cardir==CARSTATE.enCATCH):
            servo_angle(S4,CLAW_CATCH) #抓取
    elif(carstate==CARSTATE.enTRACING):#寻迹
        tracingline_auto_control(img)
    elif(carstate==CARSTATE.enTRAKING): #自动追踪捡球
        find_ball_auto_control(img,mode=0)
    elif(carstate==CARSTATE.enAVOIDING):#自动捡球避障
        find_ball_auto_control(img,mode=1)


#规定：人面向机械臂的方向看机械臂运动，有三个方向，左右，前后，上下
servo_angle(S1,pan_angle,S1_offset)    #0-180是从左往右运动，减小往左运动，增大往右运动
servo_angle(S2,dis_angle,S2_offset)    #0-180是从后到前运动，减小时向后运动，增大向前运动
servo_angle(S3,tilt_angle,S3_offset)    #0-180是从上到下运动，减小时向上运动，增大向下运动
servo_angle(S4,CLAW_RELEASE)

sensor.reset() # Initialize the camera sensor.
sensor.__write_reg(0x11,0x80)
sensor.set_pixformat(sensor.RGB565) # use RGB565.
sensor.set_framesize(sensor.QVGA) # use QQVGA for speed.
#sensor.set_hmirror(True) #水平镜像，方便调试
#sensor.set_vflip(True)  #垂直镜像，根据摄像头的安装位置调整
sensor.set_auto_whitebal(False) # turn this off.
sensor.skip_frames(50) # Let new settings take affect.
sensor.set_auto_exposure(True) # turn this on
clock = time.clock() # Tracks FPS.

while(True):
    clock.tick() # Track elapsed milliseconds between snapshots().
    img = sensor.snapshot()
    car_state_deal(img)
