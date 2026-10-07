#ifndef __TIME1_H
#define __TIME1_H
#include "sys.h"

extern  u8 miao;
void TIM1_Int_Init(u16 arr,u16 psc);
void TIM1_PWM_Init(u16 arr,u16 psc,u8 ch,uint32_t RCC_APB2Periph,GPIO_TypeDef* GPIOx,uint16_t GPIO_Pinx);
#endif

