#ifndef __SERVO2_H
#define __SERVO2_H

#include "stm32f10x.h"

void Servo2_Init(void);
void Servo2_SetAngle(uint16_t angle);
void Servo2_Loop(void);
void Servo2_DoCycle(void);

#endif
