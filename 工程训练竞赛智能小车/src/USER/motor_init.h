#ifndef __MOTOR_INIT_H
#define __MOYOR_INIT_H
#include "stm32f4xx.h"                  // Device header
#include "math.h"
#include "Motor.h"  



//输出比较模式周期设置为0xFFFF
#define TIM_PERIOD                   0xFFFF


void MOTOR_GPIO_Init(void);
void MOTOR_TIM_Init(void);
void SIGAN_GPIO_Init(void);
void SIGAN_TIM_Init(void);

#endif

