#ifndef __SELF_BALANCING_H
#define __SELF_BALANCING_H


void balance_control_single_control(void);
void balance_control_double_closed_loop(void);



extern float balance_angle_expect,balance_angle_output,balance_speed_scale;


extern float balance_gyro_output;


extern controller selfbalance_angle1_ctrl,selfbalance_angle2_ctrl;		//自平衡角度控制器结构体
extern controller selfbalance_gyro_ctrl;	

extern uint8_t balance_speed_ctrl_enable,balance_steer_ctrl_enable,balance_ctrl_loop_num;
#endif




