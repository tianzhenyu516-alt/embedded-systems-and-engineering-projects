#include "ti_msp_dl_config.h"
#include "headfile.h"

u8 flag_ti = 1, flag_step = 0, flag_delay = 0, flag_count = 0, target_circle = 1, circle = 0; //标志位
u16 count = 0;//计数
uint8_t stop_buf[6] = {0xff, 0x01, 0x01, 0x01, 0x01, 0x0d}; // 退出云台打靶要发送的数据帧
uint8_t Ti_2_buf[6] = {0xff, 0x02, 0x02, 0x02, 0x02, 0x0d}; // 任务2要发送的数据帧
uint8_t Ti_3_buf[6] = {0xff, 0x03, 0x03, 0x03, 0x03, 0x0d}; // 任务3要发送的数据帧
uint8_t Ti_4_buf[6] = {0xff, 0x04, 0x04, 0x04, 0x04, 0x0d}; // 任务4要发送的数据帧
uint8_t Ti_5_buf[6] = {0xff, 0x05, 0x05, 0x05, 0x05, 0x0d}; // 任务5要发送的数据帧
uint8_t Ti_6_buf[6] = {0xff, 0x06, 0x06, 0x06, 0x06, 0x0d}; // 任务6要发送的数据帧
int main(void)
{
    SYSCFG_DL_init();	        //系统资源配置初始化
    OLED_Init();			    //显示屏初始化
    nGPIO_Init();			    //蜂鸣器初始化
    ctrl_params_init();			//控制参数初始化
    trackless_params_init();    //硬件配置初始化
    rgb_init();				    //RGB灯初始化
    Encoder_Init();				//编码器资源初始化
    Button_Init();				//板载按键初始化
    timer_irq_config();         //定时器中断配置
    usart_irq_config();         //串口中断配置
    PPM_Init();
    while(1)
    {
        LCD_clear_L(0, 0);
        display_6_8_string(0, 0, "flag_ti:");//题目序号
        display_6_8_number(70, 0, flag_ti);

        LCD_clear_L(0, 1);
        display_6_8_string(0, 1, "flag_step:");//单题步骤
        display_6_8_number(70, 1, flag_step);

        LCD_clear_L(0, 2);
        display_6_8_string(0, 2, "target_circle:");//目标圈数
        display_6_8_number(90, 2, target_circle);

        LCD_clear_L(0, 3);
        display_6_8_string(0, 3, "circle:");//当前圈数
        display_6_8_number(70, 3, circle);

        LCD_clear_L(0, 4);
        display_6_8_string(0, 4, "turn:");//转弯状态
        display_6_8_number(70, 4, flag_count);

        LCD_clear_L(0, 5);
        display_6_8_string(0, 5, "cms_LR");//轮速
        display_6_8_number_pro(45, 5, smartcar_imu.left_motor_speed_cmps);
        display_6_8_number_pro(90, 5, smartcar_imu.right_motor_speed_cmps);

        LCD_clear_L(0, 6);
        display_6_8_string(0, 6, "gray_e");//灰度检测输出
        display_6_8_number_pro(45, 6, gray_status[0]);

        LCD_clear_L(0, 7);
        display_6_8_string(0, 7, "vel_exp");//期望速度
        display_6_8_number_pro(60, 7, speed_setup);
    }
}


void maple_duty_200hz(void)
{
    get_wheel_speed();			   //获取轮胎转速
    motor_output(speed_ctrl_mode); //控制器输出
    read_button_state_all();       //按键状态读取
    laser_light_work(&beep);       //电源板蜂鸣器驱动
    bling_working(0);              //状态指示
}

/***************************************
函数名:	void duty_1000hz(void)
说明: 1000hz实时任务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void duty_1000hz(void)
{
    gpio_input_check_channel_5();//检测5路灰度灰度管状态
}


/***************************************
函数名:	void duty_100hz(void)
说明: 100hz实时任务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/

int mode3_flag=0;
void duty_100hz(void)
{
    switch(flag_ti)//赛题任务
    {
    case 1://任务一（多圈行驶）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
            }
            if(count > 5)//延时启动
            {
                flag_step++;
                flag_delay = 0;//延时标志
                trackless_output.unlock_flag = UNLOCK;//电机解锁
            }
            break;
        case 1:
            speed_ctrl_mode = 1; //速度控制方式为两轮单独控制
            gray_turn_control_200hz(&turn_ctrl_pwm);//基于灰度对管的转向控制
            //期望速度
            speed_expect[0] = speed_setup + turn_ctrl_pwm * turn_scale; //左边轮子速度期望
            speed_expect[1] = speed_setup - turn_ctrl_pwm * turn_scale; //右边轮子速度期望
            //速度控制
            speed_control_100hz(speed_ctrl_mode);

            if(flag_turn)//左侧光电管检测到黑线进入左转
            {
                flag_turn = 0;
                flag_end = 0;
                flag_step ++;
                flag_delay = 1;
                buzzer_setup(200, 0.5, 4);//报警
            }
            break;

        case 2:
            speed_output[0] = 200;
            speed_output[1] = 200;//前进
            if(count > 1)//
            {
                flag_step++;
                flag_delay = 0;//延时标志
            }
            break;

        case 3:
            speed_output[0] = -400;
            speed_output[1] = 400;//左转
            if(flag_end)//中间光电管检测到黑线 退出左转
            {
                flag_count++;
                if(flag_count >= 4)//四次左转即为一圈
                {
                    flag_count = 0;
                    circle++;
                }
                flag_turn = 0;
                flag_end = 0;
                flag_step = 1;
                buzzer_setup(200, 0.5, 4);//报警
                if(circle == target_circle)//到达指定圈数
                {
                    circle = 0;
                    flag_ti++;
                    flag_step = 0;
                    trackless_output.unlock_flag = LOCK;//电机上锁
                }
            }
            break;

        }
        break;
    case 2://任务二（自定位置打靶）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, Ti_2_buf, 6);//串口发送打靶指令

                flag_step = 0;
                flag_ti++;
            }
            break;
        }
        break;

    case 3://任务三（随机位置打靶）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, stop_buf, 6);//串口发送退出打靶指令
                flag_step ++;
            }
            break;
        case 1:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, Ti_3_buf, 6);//串口发送扫描打靶指令
                flag_ti ++;
                flag_step = 0;
            }
            break;
        }
        break;

    case 4://任务四（单圈行驶打靶）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, Ti_4_buf, 6);//串口发送打靶指令
							  mode3_flag=1;
            }
            if(count > 5&&mode3_flag==1)//延时启动
            {   mode3_flag=0;
                flag_step++;
                flag_delay = 0;//延时标志
                trackless_output.unlock_flag = UNLOCK;//电机解锁
            }
            break;
        case 1:
            speed_ctrl_mode = 1; //速度控制方式为两轮单独控制
            gray_turn_control_200hz(&turn_ctrl_pwm);//基于灰度对管的转向控制
            //期望速度
            speed_expect[0] = speed_setup + turn_ctrl_pwm * turn_scale; //左边轮子速度期望
            speed_expect[1] = speed_setup - turn_ctrl_pwm * turn_scale; //右边轮子速度期望
            //速度控制
            speed_control_100hz(speed_ctrl_mode);

            if(flag_turn)//左侧光电管检测到黑线进入左转
            {
                flag_turn = 0;
                flag_end = 0;
                flag_step ++;
                flag_delay = 1;
                buzzer_setup(200, 0.5, 4);//报警
            }
            break;

        case 2:
            speed_output[0] = 200;
            speed_output[1] = 200;//前进
            if(count > 1)//
            {
                flag_step++;
                flag_delay = 0;//延时标志
            }
            break;

        case 3:
            speed_output[0] = -400;
            speed_output[1] = 400;//左转
            if(flag_end)//中间光电管检测到黑线 退出左转
            {
                flag_count++;
                if(flag_count >= 4)//四次左转即为一圈
                {
                    flag_count = 0;
                    circle++;
                }
                flag_turn = 0;
                flag_end = 0;
                flag_step = 1;
                buzzer_setup(200, 0.5, 4);//报警
                if(circle == 1)//到达指定圈数
                {
                    circle = 0;
                    flag_ti++;
                    flag_step = 0;
                    trackless_output.unlock_flag = LOCK;//电机上锁
                }
            }
            break;
        }
        break;

    case 5://任务五（两圈圈行驶打靶）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, Ti_5_buf, 6);//串口发送打靶指令
            }
            if(count > 5)//延时启动
            {
                flag_step++;
                flag_delay = 0;//延时标志
                trackless_output.unlock_flag = UNLOCK;//电机解锁
                UART_SendBytes(UART_2_INST, Ti_4_buf, 6);//串口发送退出打靶指令
            }
            break;
        case 1:
            speed_ctrl_mode = 1; //速度控制方式为两轮单独控制
            gray_turn_control_200hz(&turn_ctrl_pwm);//基于灰度对管的转向控制
            //期望速度
            speed_expect[0] = speed_setup + turn_ctrl_pwm * turn_scale; //左边轮子速度期望
            speed_expect[1] = speed_setup - turn_ctrl_pwm * turn_scale; //右边轮子速度期望
            //速度控制
            speed_control_100hz(speed_ctrl_mode);

            if(flag_turn)//左侧光电管检测到黑线进入左转
            {
                flag_turn = 0;
                flag_end = 0;
                flag_step ++;
                flag_delay = 1;
                buzzer_setup(200, 0.5, 4);//报警
            }
            break;

        case 2:
            speed_output[0] = 200;
            speed_output[1] = 200;//前进
            if(count > 1)//
            {
                flag_step++;
                flag_delay = 0;//延时标志
            }
            break;

        case 3:
            speed_output[0] = -400;
            speed_output[1] = 400;//左转
            if(flag_end)//中间光电管检测到黑线 退出左转
            {
                flag_count++;
                if(flag_count >= 4)//四次左转即为一圈
                {
                    flag_count = 0;
                    circle++;
                }
                flag_turn = 0;
                flag_end = 0;
                flag_step = 1;
                buzzer_setup(200, 0.5, 4);//报警
                if(circle == 2)//到达指定圈数
                {
                    circle = 0;
                    flag_ti++;
                    flag_step = 0;
                    trackless_output.unlock_flag = LOCK;//电机上锁
                }
            }
            break;

        }
        break;
         case 6://任务六（单圈行驶画圆）
        switch(flag_step)
        {
        case 0:
            if(_button.state[UP].press == SHORT_PRESS)//BSL按下(A18高电平)
            {
                flag_delay = 1;
                buzzer_setup(200, 0.5, 2);
                _button.state[UP].press = NO_PRESS;
                UART_SendBytes(UART_2_INST, Ti_6_buf, 6);//串口发送打靶指令
            }
            if(count > 5)//延时启动
            {
                flag_step++;
                flag_delay = 0;//延时标志
                trackless_output.unlock_flag = UNLOCK;//电机解锁
            }
            break;
        case 1:
            speed_ctrl_mode = 1; //速度控制方式为两轮单独控制
            gray_turn_control_200hz(&turn_ctrl_pwm);//基于灰度对管的转向控制
            //期望速度
            speed_expect[0] = speed_setup + turn_ctrl_pwm * turn_scale; //左边轮子速度期望
            speed_expect[1] = speed_setup - turn_ctrl_pwm * turn_scale; //右边轮子速度期望
            //速度控制
            speed_control_100hz(speed_ctrl_mode);

            if(flag_turn)//左侧光电管检测到黑线进入左转
            {
                flag_turn = 0;
                flag_end = 0;
                flag_step ++;
                flag_delay = 1;
                buzzer_setup(200, 0.5, 4);//报警
            }
            break;

        case 2:
            speed_output[0] = 200;
            speed_output[1] = 200;//前进
            if(count > 1)//
            {
                flag_step++;
                flag_delay = 0;//延时标志
            }
            break;

        case 3:
            speed_output[0] = -400;
            speed_output[1] = 400;//左转
            if(flag_end)//中间光电管检测到黑线 退出左转
            {
                flag_count++;
                if(flag_count >= 4)//四次左转即为一圈
                {
                    flag_count = 0;
                    circle++;
                }
                flag_turn = 0;
                flag_end = 0;
                flag_step = 1;
                buzzer_setup(200, 0.5, 4);//报警
                if(circle == 1)//到达指定圈数
                {
                    circle = 0;
                    flag_ti=0;
                    flag_step = 0;
                    trackless_output.unlock_flag = LOCK;//电机上锁
                }
            }
            break;

        }
        break;
    }
}


/***************************************
函数名:	void duty_10hz(void)
说明: 10hz实时任务函数
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void duty_10hz(void)
{
    if(flag_delay == 1)count++;
    else count = 0;

    if(_button.state[DOWN].press == SHORT_PRESS)//K1按下 赛题任务切换
    {
        flag_ti++;
        if(flag_ti > 6)flag_ti = 1;
        _button.state[DOWN].press = NO_PRESS;
    }

    if(_button.state[K2].press == SHORT_PRESS)//K2按下 目标圈数选择
    {
        target_circle++;
        if(target_circle > 5)target_circle = 1;
        _button.state[K2].press = NO_PRESS;
    }
}