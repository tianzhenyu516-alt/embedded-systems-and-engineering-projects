#ifndef __LED_H__
#define __LED_H__

#include "sys.h"

#define LED_GPIO_PIN1   GPIO_Pin_13
#define wifi_rst_PIN        GPIO_Pin_14

#define LED_GPIO_PORT  GPIOC
#define LED_GPIO_CLK  RCC_APB2Periph_GPIOC


#define WIFI_GPIO_PORT  GPIOC
#define WIFI_GPIO_CLK  RCC_APB2Periph_GPIOC

#define LED1_OFF       GPIO_ResetBits(LED_GPIO_PORT, LED_GPIO_PIN1) //¹Ø        
#define LED1_ON      GPIO_SetBits(LED_GPIO_PORT, LED_GPIO_PIN1)      //¿ª     

#define LED2_OFF       GPIO_ResetBits(LED_GPIO_PORT, LED_GPIO_PIN2)         
#define LED2_ON      GPIO_SetBits(LED_GPIO_PORT, LED_GPIO_PIN2)    

#define LED3_OFF       GPIO_ResetBits(LED_GPIO_PORT, LED_GPIO_PIN3)         
#define LED3_ON      GPIO_SetBits(LED_GPIO_PORT, LED_GPIO_PIN3) 

#define JDQ_OFF       GPIO_ResetBits(LED_GPIO_PORTB, JDQ_GPIO_PIN4)         
#define JDQ_ON     GPIO_SetBits(LED_GPIO_PORTB, JDQ_GPIO_PIN4) 
#define JDQ2_OFF       GPIO_ResetBits(WIFI_GPIO_PORT, JDQ_GPIO_PIN5)         
#define JDQ2_ON     GPIO_SetBits(WIFI_GPIO_PORT, JDQ_GPIO_PIN5) 

#define WIFI_RST     GPIO_SetBits(WIFI_GPIO_PORT, wifi_rst_PIN) 

#define REDSW PBin(8)

void LED_StateRefresh(uint8_t LEDState); 
void RedSwitch_Init(void);



void LED_Sta(void);

void LED_GPIO_Config(void);
void wifi_GPIO_Config(void);

#endif

