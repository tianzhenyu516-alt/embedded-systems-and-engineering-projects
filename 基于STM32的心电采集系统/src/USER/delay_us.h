#ifndef _delay_h_
#define _delay_h_

#include "stm32f10x.h"

void SysTick_Init(void);
void Delay_us(__IO u32 nTime);

#endif

