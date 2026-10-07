
#include "sys.h"
int leddelya;
void LED_AllOff(void);
void LED_GPIO_Config(void)
{
	GPIO_InitTypeDef GPIO_InitStruct;
	RCC_APB2PeriphClockCmd(LED_GPIO_CLK, ENABLE);
	GPIO_InitStruct.GPIO_Pin = LED_GPIO_PIN1;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_50MHz;
	
	GPIO_Init(LED_GPIO_PORT, &GPIO_InitStruct);		
}
void wifi_GPIO_Config(void)
{
	GPIO_InitTypeDef GPIO_InitStruct;
	RCC_APB2PeriphClockCmd(WIFI_GPIO_CLK, ENABLE);

	GPIO_InitStruct.GPIO_Pin = wifi_rst_PIN ;
	GPIO_InitStruct.GPIO_Mode = GPIO_Mode_Out_PP;
	GPIO_InitStruct.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(WIFI_GPIO_PORT, &GPIO_InitStruct);	
	
    GPIO_WriteBit(GPIOC, GPIO_Pin_14, Bit_RESET);
	delay_ms(250);
	GPIO_WriteBit(GPIOC, GPIO_Pin_14, Bit_SET);
	delay_ms(500);
	
}

//红外对管初始化
void RedSwitch_Init(void)
{
    GPIO_InitTypeDef  GPIO_InitStructure;
    RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);	 //使能PB,PE端口时钟

    GPIO_InitStructure.GPIO_Pin = GPIO_Pin_8;				 //LED0-->PB.5 端口配置
    GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING; 		 //推挽输出
    GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;		 //IO口速度为50MHz
    GPIO_Init(GPIOB, &GPIO_InitStructure);					 //根据设定参数初始化GPIOB.5
}

void LED_StateRefresh(uint8_t LEDState)  
{  
#define LED_PERIID_TIME       10    // period 1.0s  
#define LED_ON_TIME     1     // lighting last time  
#define LED_CYCLE_TIME        1     // one times
      
    static int32_t s_LedCycleTime = LED_PERIID_TIME;  
    static int32_t s_Cnt = LED_ON_TIME * LED_CYCLE_TIME * 2;      
  
    if(s_LedCycleTime > 0){  
        s_LedCycleTime --;  
        if(s_Cnt > 0){  
            if(s_Cnt % (LED_ON_TIME * 2) == 0){  
                LED1_ON;
            }else{  
                LED1_OFF;
            }  
            s_Cnt --;  
        }else{  
            LED1_OFF;
        }  
    }else{  
        s_LedCycleTime = LED_PERIID_TIME;  
        s_Cnt = LED_ON_TIME * LEDState * 2;  
        LED1_OFF;
    }  
}

