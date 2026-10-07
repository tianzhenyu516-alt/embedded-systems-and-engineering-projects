# Untitled - By: Admin - Sun Mar 17 2024
import pyb
from pyb import Pin,Timer
class UMOTOR:
    def __init__(self):
        ############################电机驱动部分############################
        # Untitled - By: mengfan_zheng - 周日 5月 8 2022
        self.pwmA1 = Pin('B0')   #TIM3_CH3
        self.pwmA2 = Pin('B1')   #TIM3_CH4
        self.pwmB1 = Pin('B4')   #TIM3_CH1
        self.pwmB2 = Pin('B5')   #TIM3_CH2
        # 定义定时器3，频率为100Hz，即10ms一次定时器中断
        self.tim = Timer(3, freq=100)
        # 初始化PWM，通过调节PWM控制左右轮速度，初试占空比为0（车静止）
        self.Left1 = self.tim.channel(4, Timer.PWM, pin=self.pwmA1,pulse_width_percent=0)
        self.Left2 = self.tim.channel(3, Timer.PWM, pin=self.pwmA2,pulse_width_percent=0)
        self.Ritht1 = self.tim.channel(1, Timer.PWM, pin=self.pwmB1,pulse_width_percent=0)
        self.Ritht2 = self.tim.channel(2, Timer.PWM, pin=self.pwmB2,pulse_width_percent=0)
    #功能： 小车控制
    #输入： 左，右速度
    #输出： 无
    def run(self,left_speed, right_speed):
        #print("left_speed",left_speed)
        #print("right_speed",right_speed)
        if left_speed < -100:
            left_speed = -100
        elif left_speed > 100:
            left_speed = 100
        if right_speed < -100:
            right_speed = -100
        elif right_speed > 100:
            right_speed = 100
        if left_speed > 0:
            self.Left1.pulse_width_percent(abs(left_speed))
            self.Left2.pulse_width_percent(abs(0))
        else:
            self.Left1.pulse_width_percent(abs(0))
            self.Left2.pulse_width_percent(abs(left_speed))
        if right_speed > 0:
            self.Ritht1.pulse_width_percent(abs(right_speed))
            self.Ritht2.pulse_width_percent(abs(0))
        else:
            self.Ritht1.pulse_width_percent(abs(0))
            self.Ritht2.pulse_width_percent(abs(right_speed))
