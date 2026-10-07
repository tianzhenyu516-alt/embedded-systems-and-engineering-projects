#ifndef __LED_H
#define	__LED_H

#include "stm32f4xx.h"

#define LED1_OFF GPIO_SetBits(GPIOF,GPIO_Pin_9);    //PF9输出高电平
#define LED1_ON GPIO_ResetBits(GPIOF,GPIO_Pin_9);   //PF9输出低电平
#define LED2_OFF GPIO_SetBits(GPIOF,GPIO_Pin_10);    //PF10输出高电平
#define LED2_ON GPIO_ResetBits(GPIOF,GPIO_Pin_10);   //PF10输出低电平


void LED_GPIO_Config(void);   /* LED 端口初始化 */

#endif /* __LED_H */
