#ifndef __RELAY_H__
#define __RELAY_H__

#include "sys.h"

#define RELAY_GPIO_PIN   GPIO_Pin_7
#define RELAY_GPIO_PIN1   GPIO_Pin_8
#define RELAY_GPIO_PIN2   GPIO_Pin_9

#define RELAY_GPIO_PORT  GPIOB
#define RELAY_GPIO_CLK  RCC_APB2Periph_GPIOB





#define RELAY_ON       GPIO_SetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN)         
#define RELAY_OFF      GPIO_ResetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN)          

#define RELAY1_ON       GPIO_SetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN1)         
#define RELAY1_OFF      GPIO_ResetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN1) 

#define RELAY2_ON       GPIO_SetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN2)         
#define RELAY2_OFF      GPIO_ResetBits(RELAY_GPIO_PORT, RELAY_GPIO_PIN2)

void RELAY_GPIO_Config(void);


#endif

