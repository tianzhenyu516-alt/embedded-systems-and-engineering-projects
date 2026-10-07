#include "sys.h"
void XC_GPIO_Config(void)
{
	GPIO_InitTypeDef GPIO_InitStruct;
	RCC_APB2PeriphClockCmd(XC_GPIO_CLK, ENABLE);
	
	
	GPIO_InitStruct.GPIO_Pin = QIAN1|QIAN2|HOU1|HOU2|TUODI|TUODO ;
	
	
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_50MHz;
	
	GPIO_Init(XIAO_CHE, &GPIO_InitStruct);	
	
	
}
void XC_GPIO_Config_B(void)
{
	GPIO_InitTypeDef GPIO_InitStruct;
	RCC_APB2PeriphClockCmd(XC_GPIO_CLK_B, ENABLE);
	
	
	GPIO_InitStruct.GPIO_Pin = TUODI|TUODO ;
	
	
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_50MHz;
	
	GPIO_Init(XIAO_CHE_B, &GPIO_InitStruct);	
	
	
}