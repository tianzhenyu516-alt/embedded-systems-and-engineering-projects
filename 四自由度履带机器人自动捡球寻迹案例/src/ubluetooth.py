# Untitled - By: Admin - Sun Mar 17 2024
from pyb import UART,Pin,Timer
#主体功能：
#视觉追踪小车：蓝牙控制小车，循迹，目标跟随（颜色/人脸识别跟随），避障（循迹+目标识别避障）
#机械臂自动搬运小车：蓝牙控制小车，循迹目标识别自动搬运，目标自动跟随捡球，机械臂控制
#蓝牙协议：
#蓝牙数据发送规则：操作按钮按下发送数据，抬起发送0x00，
#控制模式切换方式：如按下循迹，进入自动循迹功能，再按一下上或者下进入手动控制小车，但是在舵机控制模式下，必须先切换到其他三种模式才能再进入手动控制小车的模式
#自动搬运小车数据协议：0x00 停止; 0x01 前进（机械臂向上）; 0x02 后退（机械臂向下）；0x03 左转（机械臂向左）；0x04 右转（机械臂向右）；
#0x05 循迹；0x06 跟随；0x07 避障；0x08 （释放）；0x09 （抓取） 机械臂控制（上下左右按钮用来控制机械臂）
#小车状态全局变量
#定义小车状态数据结构
class CARSTATE(object) :
    enSTOP      =0  #停车
    enRUN       =1  #前进
    enBACK      =2  #后退
    enLEFT      =3  #左转
    enRIGHT     =4  #右转
    enRELEASE   =5  #释放
    enCATCH     =6  #抓取
    enMANUAL    =7  #手动控制
    enTRACING   =8  #循迹
    enTRAKING   =9  #跟踪抓取
    enAVOIDING  =10 #避障模式
    enFLITING   =11 #舵机控制模式
    enSTRAKING  =12 #舵机追踪模式

class UBLUETOOTH :
    def __init__(self,uart_port,baudrate):
        self.g_carstate     = CARSTATE.enTRAKING
        self.g_cardir       = CARSTATE.enSTOP
        self.g_power        =800
        self.LeftMotorOut   =0
        self.RightMotorOut  =0
        self.s_flag         =0
        self.uart1 = UART(uart_port, baudrate)  # PA9,PA10 #蓝牙控制串口

    def bluetooth_deal(self,g_power=800):
        self.s_flag=0
        if self.uart1.any():
            rec=self.uart1.read(1)
            if rec != None:
                rec=bytes(rec)
                #print(rec)
                if rec==b'\x00': #停车
                    self.g_cardir=CARSTATE.enSTOP
                elif rec==b'\x01': #前进
                    self.g_cardir=CARSTATE.enRUN
                elif rec==b'\x02': #后退
                    self.g_cardir=CARSTATE.enBACK
                elif rec==b'\x03': #左转
                    self.g_cardir=CARSTATE.enLEFT
                elif rec==b'\x04': #右转
                    self.g_cardir=CARSTATE.enRIGHT
                elif rec==b'\x05': #循迹
                    self.g_carstate=CARSTATE.enTRACING
                    self.s_flag=1
                elif rec==b'\x06': #跟随
                    self.g_carstate=CARSTATE.enTRAKING
                    self.s_flag=2
                elif rec==b'\x07': #避障
                    self.g_carstate=CARSTATE.enAVOIDING
                    self.s_flag=3
                    #自定义
                elif rec==b'\x08': #app上是关灯按钮
                    self.g_cardir=CARSTATE.enRELEASE
                    self.g_carstate=CARSTATE.enFLITING
                elif rec==b'\x09': #app上是开灯，自定义
                    self.g_cardir=CARSTATE.enCATCH
                    self.g_carstate=CARSTATE.enSTRAKING
                    #一键切换到手动模式,暂时没有这个按键，非机械臂控制模式下直接按上下左右进行小车手动控制
                elif rec==b'\xF0':
                    self.g_carstate=CARSTATE.enMANUAL
        if (self.g_carstate<CARSTATE.enFLITING and self.g_cardir>CARSTATE.enSTOP and self.g_cardir<=CARSTATE.enRIGHT): #手动控制小车
            self.g_carstate=CARSTATE.enMANUAL
            self.g_power=g_power#这里可以控制车速
        if (self.g_carstate==CARSTATE.enMANUAL):
            if(self.g_cardir==CARSTATE.enSTOP):
                self.LeftMotorOut   =0
                self.RightMotorOut  =0
            elif(self.g_cardir==CARSTATE.enRUN):
                self.LeftMotorOut  =self.g_power
                self.RightMotorOut =self.g_power
            elif(self.g_cardir==CARSTATE.enBACK):
                self.LeftMotorOut  =-self.g_power
                self.RightMotorOut =-self.g_power
            elif(self.g_cardir==CARSTATE.enLEFT):
                self.LeftMotorOut  =-self.g_power/2
                self.RightMotorOut =self.g_power/2
            elif(self.g_cardir==CARSTATE.enRIGHT):
                self.LeftMotorOut  =self.g_power/2
                self.RightMotorOut =-self.g_power/2
        return self.g_carstate,self.g_cardir,self.LeftMotorOut,self.RightMotorOut,self.s_flag
