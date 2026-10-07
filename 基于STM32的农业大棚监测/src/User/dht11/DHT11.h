#ifndef __DHT11_H
#define	__DHT11_H



#include "sys.h"



/************************** DHT11 数据类型定义********************************/
typedef struct
{
	uint8_t  humi_int;		//湿度的整数部分
	uint8_t  humi_deci;	 	//湿度的小数部分
	uint8_t  temp_int;	 	//温度的整数部分
	uint8_t  temp_deci;	 	//温度的小数部分
	uint8_t  check_sum;	 	//校验和
		                 
} DHT11_Data_TypeDef;



/************************** DHT11 连接引脚定义********************************/
#define      DHT11_Dout_SCK_APBxClock_FUN              RCC_APB2PeriphClockCmd
#define      DHT11_Dout_GPIO_CLK                       RCC_APB2Periph_GPIOA

#define      DHT11_Dout_GPIO_PORT                      GPIOA
#define      DHT11_Dout_GPIO_PIN                       GPIO_Pin_4



/************************** DHT11 函数宏定义********************************/
#define      DHT11_Dout_0	  GPIO_ResetBits ( DHT11_Dout_GPIO_PORT, DHT11_Dout_GPIO_PIN ) 
#define      DHT11_Dout_1	  GPIO_SetBits ( DHT11_Dout_GPIO_PORT, DHT11_Dout_GPIO_PIN ) 

#define      DHT11_Dout_IN()	 GPIO_ReadInputDataBit ( DHT11_Dout_GPIO_PORT, DHT11_Dout_GPIO_PIN ) 



extern u8 tempInt,tempDeci,humiInt,humiDeci;
extern DHT11_Data_TypeDef dht11Data;

/************************** DHT11 函数声明 ********************************/
void DHT11_Init( void );
uint8_t DHT11_Read_TempAndHumidity( DHT11_Data_TypeDef * DHT11_Data);
void Get_dht11(void);	

#endif /* __DHT11_H */







