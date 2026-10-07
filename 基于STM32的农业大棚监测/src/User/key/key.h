#ifndef __KEY_H
#define __KEY_H	 
#include "sys.h"
  	 

extern u8 isKey1;
extern u8 isKey2;
extern u8 isKey3;
extern u8 isKey4;
extern u8 isKey5;
extern u8 isKey6;
extern u8 isKey7;
extern u8 isKey8;

/* 相关端口配置宏 */
#define KEY1_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY1_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY1_GPIO_PIN		GPIO_Pin_12					/* 连接到SCL时钟线的GPIO */


#define KEY2_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY2_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY2_GPIO_PIN		GPIO_Pin_13					/* 连接到SCL时钟线的GPIO */

#define KEY3_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY3_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY3_GPIO_PIN		GPIO_Pin_14					/* 连接到SCL时钟线的GPIO */

#define KEY4_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY4_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY4_GPIO_PIN		GPIO_Pin_15					/* 连接到SCL时钟线的GPIO */


#define KEY5_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY5_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY5_GPIO_PIN		GPIO_Pin_4					/* 连接到SCL时钟线的GPIO */


#define KEY6_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY6_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY6_GPIO_PIN		GPIO_Pin_5					/* 连接到SCL时钟线的GPIO */

#define KEY7_GPIO_CLK 	    RCC_APB2Periph_GPIOA		/* GPIO端口时钟 */
#define KEY7_GPIO_PORT    	GPIOA						/* GPIO端口 */
#define KEY7_GPIO_PIN		GPIO_Pin_0					/* 连接到SCL时钟线的GPIO */

#define KEY8_GPIO_CLK 	    RCC_APB2Periph_GPIOB		/* GPIO端口时钟 */
#define KEY8_GPIO_PORT    	GPIOB						/* GPIO端口 */
#define KEY8_GPIO_PIN		GPIO_Pin_1				/* 连接到SCL时钟线的GPIO */




#define KEY1 	GPIO_ReadInputDataBit(KEY1_GPIO_PORT,KEY1_GPIO_PIN)//读取按键1
#define KEY2  	GPIO_ReadInputDataBit(KEY2_GPIO_PORT,KEY2_GPIO_PIN)//读取按键2
#define KEY3  	GPIO_ReadInputDataBit(KEY3_GPIO_PORT,KEY3_GPIO_PIN) //读取按键3
#define KEY4  	GPIO_ReadInputDataBit(KEY4_GPIO_PORT,KEY4_GPIO_PIN) //读取按键4

#define KEY5 	GPIO_ReadInputDataBit(KEY5_GPIO_PORT,KEY5_GPIO_PIN)//读取按键5
#define KEY6  	GPIO_ReadInputDataBit(KEY6_GPIO_PORT,KEY6_GPIO_PIN)//读取按键6
#define KEY7  	GPIO_ReadInputDataBit(KEY7_GPIO_PORT,KEY7_GPIO_PIN) //读取按键7
#define KEY8  	GPIO_ReadInputDataBit(KEY8_GPIO_PORT,KEY8_GPIO_PIN) //读取按键8


void KEY_Init(void);//IO初始化
void Key1Press(void);
void Key2Press(void);
void Key3Press(void);
void Key4Press(void);

void Key5Press(void);
void Key6Press(void);
void Key7Press(void);
void Key8Press(void);

void KeyScan(void);
#endif
