#ifndef __HX711_H
#define __HX711_H
#include "stm32f10x.h"

// HX711使用GPIOB引脚，避免与舵机使用的PA1/PA2冲突
#define		HX711_GPIO_CLK								RCC_APB2Periph_GPIOB
#define 	HX711_SCK_GPIO_PORT						GPIOB
#define 	HX711_SCK_GPIO_PIN						GPIO_Pin_0
#define 	HX711_DT_GPIO_PORT						GPIOB
#define 	HX711_DT_GPIO_PIN						GPIO_Pin_1

#define HX711_SCK_H				GPIO_SetBits(HX711_SCK_GPIO_PORT,HX711_SCK_GPIO_PIN);
#define HX711_SCK_L				GPIO_ResetBits(HX711_SCK_GPIO_PORT,HX711_SCK_GPIO_PIN);
#define HX711_DT				GPIO_ReadInputDataBit(HX711_DT_GPIO_PORT, HX711_DT_GPIO_PIN)

void HX711_Init(void);
uint32_t HX711_Get_Data(void);

#endif
