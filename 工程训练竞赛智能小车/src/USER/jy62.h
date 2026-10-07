#ifndef __JY62_H
#define __JY62_H
#include "stm32f4xx.h"                  // Device header

extern u8 v831_y[3];
extern u8 v831_RxFlag;

void jy62_init(void);
void v831_SendByte(u8 Byte);
	
extern u8 hwt101[22];
void TIM4_Config(void);
extern u8 hwt[5];
void V831_SendArray(u8 *Array, s16 Length);
#endif
