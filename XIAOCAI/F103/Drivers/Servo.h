#ifndef __SERVO_H
#define __SERVO_H

#include "stm32f10x.h"

void Servo_Init(void);
void Servo_Stop(void);
void Servo_SetAngle(uint16_t angle);  // 设置角度（0-270度）
void Servo_RotateForward(uint16_t speed);
void Servo_RotateBackward(uint16_t speed);
void Servo_RotateDegrees(int16_t degrees, uint16_t speed);
void Servo_Swing(uint16_t angle, uint8_t times);  // 来回摆动

#endif
