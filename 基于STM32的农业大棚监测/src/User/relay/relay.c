
#include "sys.h"

void RELAY_GPIO_Config(void)
{
	GPIO_InitTypeDef GPIO_InitStruct;
	RCC_APB2PeriphClockCmd(RELAY_GPIO_CLK, ENABLE); 
	GPIO_InitStruct.GPIO_Pin = RELAY_GPIO_PIN|RELAY_GPIO_PIN1|RELAY_GPIO_PIN2;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(RELAY_GPIO_PORT, &GPIO_InitStruct);
	
	RELAY_OFF;	RELAY1_OFF;	RELAY2_OFF;	
}







