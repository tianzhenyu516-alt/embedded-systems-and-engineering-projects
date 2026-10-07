#ifndef __ATTITUDE_SELFSTABLE_H
#define __ATTITUDE_SELFSTABLE_H



#define  THR_MAX_OUTPUT      2000//油门输出最大值
#define  THR_MIN_OUTPUT      1000//油门输出最小值
#define  THR_IDEL_OUTPUT     1150//油门怠速，取接近起转油门值即可1150
#define  THR_CONTROL_WORK    1150//俯仰、横滚、偏航控制器开始起作用的油门量 1150
#define  THR_STARTUP_MIN     1050//起转油门量，油门倾角补偿用，太大会导致过补偿


void attitude_ctrl_init(void);
void attitude_control(void);
void takeoff_ctrl_reset(void);
void ncontroller_output(void);

#endif

