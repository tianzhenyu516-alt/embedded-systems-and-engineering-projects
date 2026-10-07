#ifndef _LIGHT_SENSOR_H
#define _LIGHT_SENSOR_H
 
#include "sys.h"

#define THIS_RCC_A  RCC_APB2Periph_GPIOA
#define THIS_IS_IOA    GPIOA

#define THIS_RCC_B  RCC_APB2Periph_GPIOB
#define THIS_IS_IOB    GPIOB

#define THIS_RCC_C  RCC_APB2Periph_GPIOC
#define THIS_IS_IOC    GPIOC

#define THIS_IS_PIN  GPIO_Pin_0
#define THISS_IS_PIN  GPIO_Pin_1


extern u16 Get_Adc_Average(u8 ch,u8 times);
extern u16 Get_Adc(u8 ch);
void Adc_Init(void);

//u16 Get_Guangzhao();
//u16 Get_Turang();
//u16 Get_co();
//u16 Get_o();
#endif
