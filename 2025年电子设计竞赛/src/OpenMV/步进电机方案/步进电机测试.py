from pyb import Pin, Timer
import time

# # ===== 电机1 引脚设置（方向P6，PWM P7，使用 Timer4） =====
# dir_pin1 = Pin('P6', Pin.OUT_PP)
# pwm_pin1 = Pin('P7')  # P7: TIM4_CH1
# tim1 = Timer(4, freq=1)
# ch1 = tim1.channel(1, Timer.PWM, pin=pwm_pin1)
# ch1.pulse_width_percent(50)
dir_pin1 = Pin('P8', Pin.OUT_PP)

# 初始化 P4 引脚为输出模式
led_pin1 = Pin('P7', Pin.OUT_PP)  # 推挽输出模式
# 定时器中断回调函数
def toggle_led1(timer):
    led_pin1.value(not led_pin1.value())  # 切换引脚电平
# 配置定时器（频率 1Hz）
tim1 = Timer(4, freq=1)  # 使用 Timer(2)，频率 1Hz
tim1.callback(toggle_led1)


# ===== 电机2 引脚设置（方向P8，PWM P9，使用 Timer2） =====
dir_pin2 = Pin('P9', Pin.OUT_PP)
# 初始化 P4 引脚为输出模式
led_pin2 = Pin('P6', Pin.OUT_PP)  # 推挽输出模式
def toggle_led2(timer):
    led_pin2.value(not led_pin2.value())  # 切换引脚电平
# 配置定时器（频率 1Hz）
tim2 = Timer(2, freq=1)  # 使用 Timer(2)，频率 1Hz
tim2.callback(toggle_led2)



# ===== 电机控制函数 =====
def motor_control(motor_id, speed, direction):
    """
    控制指定电机的转速和方向

    motor_id: 电机编号 (1 或 2)
    speed:    PWM 频率 (10~1000 Hz)
    direction: 'CW' 正转, 'CCW' 反转
    """
    if speed < 10:
        speed = 10
    elif speed > 1000:
        speed = 1000

    if motor_id == 1:
        # 电机1控制
        dir_pin = dir_pin1
        tim1.freq(speed)
    if motor_id == 2:
        # 电机1控制
        dir_pin = dir_pin2
        tim2.freq(speed)

    # 设置方向
    if direction == 'CW':
        dir_pin.high()
    elif direction == 'CCW':
        dir_pin.low()
    else:
        raise ValueError("direction 必须为 'CW' 或 'CCW'")

    # 设置频率
    # tim.freq(speed)

# ===== 示例循环 =====
speed = 100
direction = 'CW'

while True:
    motor_control(1, speed, direction)
    motor_control(2, speed, direction)

    print("Motor1: speed =", speed, ", dir =", direction)
    print("Motor2: speed =", speed, ", dir =", 'CCW' if direction == 'CW' else 'CW')

    speed += 200
    if speed > 500:
        speed = 100
        direction = 'CCW' if direction == 'CW' else 'CW'

    time.sleep(0.5)
