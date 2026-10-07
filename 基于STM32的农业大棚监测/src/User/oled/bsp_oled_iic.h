#ifndef __OLEDIIC_H
#define __OLEDIIC_H	



#include "sys.h" 

//+ + + + +  SDA + + + + +//
#define SDA_GPIO_CLK 	    RCC_APB2Periph_GPIOA		/* GPIO端口时钟 */
#define SDA_GPIO_PORT    	GPIOA  						/* GPIO端口 */
#define SDA_GPIO_PIN		GPIO_Pin_11			    	/* 连接到SCL时钟线的GPIO */					   
//+ + + + +  SCL + + + + +//
#define SCL_GPIO_CLK 	    RCC_APB2Periph_GPIOA		/* GPIO端口时钟 */
#define SCL_GPIO_PORT    	GPIOA 						/* GPIO端口 */
#define SCL_GPIO_PIN		GPIO_Pin_12			    	/* 连接到SCL时钟线的GPIO */
//= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  //
/* 屏幕初始化 */
void oled_Init(void);
/* 反显函数 */
void oled_ColorTurn(uint8_t i);
/* 屏幕旋转180度 */
void oled_DisplayTurn(uint8_t i);
/* 清屏 */
void oled_Clear(void);
/* 开显示 */
void oled_Display_On(void);
/* 关显示 */
void oled_Display_Off(void);
/* 显示字符串 */
void oled_ShowString(u8 x,u8 y, u8 *p,u8 Char_Size);
/* 显示汉字 */
void oled_ShowCHinese(u8 x,u8 y,u8 no);
/* 显示图片 */
void oled_DrawBMP(unsigned char x0, unsigned char y0,unsigned char x1, unsigned char y1,unsigned char BMP[]);
/* 显示数字 */
void oled_ShowNum(u8 x,u8 y,u32 num,u8 len,u8 size);
void OLED_ShowChar(u8 x,u8 y,u8 chr,u8 Char_Size);

void OLED_ShowFNum(u8 x,u8 y,float Fnum,u8 size1);
#endif  


