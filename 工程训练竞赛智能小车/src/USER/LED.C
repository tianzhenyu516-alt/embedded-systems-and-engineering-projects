#include "LED.h"

/*
 * 函数名：LED_GPIO_Config
 * 描述  ：配置LED用到的I/O口
 * 输入  ：无
 * 输出  ：无
 */
void LED_GPIO_Config(void)
{	

	/*定义一个GPIO_InitTypeDef类型的结构体*/
  GPIO_InitTypeDef  GPIO_InitStructure;
  	/*开启GPIOF的外设时钟*/
  RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOF, ENABLE);
/*选择要控制的GPIOF引脚*/		
  GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9 | GPIO_Pin_10;
  /*设置引脚模式为通用推挽输出*/
  GPIO_InitStructure.GPIO_Mode = GPIO_Mode_OUT;
  GPIO_InitStructure.GPIO_OType = GPIO_OType_PP;
  /*设置引脚速率为100MHz */   
  GPIO_InitStructure.GPIO_Speed = GPIO_Speed_100MHz;
  GPIO_InitStructure.GPIO_PuPd = GPIO_PuPd_UP;
  	/*调用库函数，初始化GPIOF*/
  GPIO_Init(GPIOF, &GPIO_InitStructure);
  
}