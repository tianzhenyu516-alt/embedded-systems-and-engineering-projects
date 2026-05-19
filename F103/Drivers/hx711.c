#include "hx711.h"
#include "Delay.h"

void HX711_Init()
{
	RCC_APB2PeriphClockCmd(HX711_GPIO_CLK,ENABLE);
	
	GPIO_InitTypeDef GPIO_InitStructure;
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_Out_PP;
	GPIO_InitStructure.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_InitStructure.GPIO_Pin=HX711_SCK_GPIO_PIN;
	
	GPIO_Init(HX711_SCK_GPIO_PORT,&GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Pin=HX711_DT_GPIO_PIN;
	GPIO_InitStructure.GPIO_Mode=GPIO_Mode_IPU;
	
	GPIO_Init(HX711_DT_GPIO_PORT,&GPIO_InitStructure);
	
	// 初始化SCK为低电平
	HX711_SCK_L;
}


uint32_t HX711_Get_Data(void)
{
	uint32_t Data;
	uint16_t timeout = 0;
	
	HX711_SCK_L;
	Delay_us(2);  // 增加延时，提高长线稳定性
	Data=0;
	
	// 等待DT变低，带超时保护（最多等200ms）
	while(HX711_DT) {
		Delay_us(10);
		timeout++;
		if(timeout > 20000) {  // 超时200ms，返回0
			return 0;
		}
	}
	
	Delay_us(2);  // 增加延时稳定数据
	
	for(int i=0;i<24;i++)
	{
		HX711_SCK_H;
		Delay_us(3);  // 增加SCK高电平时间，适应长线
		Data=Data<<1;
		HX711_SCK_L;
		Delay_us(3);  // 增加SCK低电平时间，适应长线
		if(HX711_DT)
		{
			Data++;
		}
	}
	HX711_SCK_H;
	Delay_us(2);
	Data=Data^0x800000;
	HX711_SCK_L;
	Delay_us(2);
	
	return Data;
}
