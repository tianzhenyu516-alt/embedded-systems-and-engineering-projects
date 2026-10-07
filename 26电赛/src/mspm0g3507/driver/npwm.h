#ifndef __NPWM_H
#define __NPWM_H


void PWM3_Init(void);
void PWM4_Init(void);

void PWM_Output(uint16_t width1,uint16_t width2,uint16_t width3,uint16_t width4);

void steer_servo_pwm_m1p0(uint16_t us);
void steer_servo_pwm_m1p1(uint16_t us);
void steer_servo_pwm_m1p2(uint16_t us);
void steer_servo_pwm_m1p3(uint16_t us);
#endif




