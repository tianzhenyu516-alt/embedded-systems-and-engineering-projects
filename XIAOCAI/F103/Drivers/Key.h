#ifndef __KEY_H
#define __KEY_H

#include "stm32f10x.h"

// PA2按键定义
#define KEY_GPIO_PORT		GPIOA
#define KEY_GPIO_PIN		GPIO_Pin_2
#define KEY_GPIO_CLK		RCC_APB2Periph_GPIOA

void Key_Init(void);
uint8_t Key_GetState(void);
uint8_t Key_Scan(void);

#endif
