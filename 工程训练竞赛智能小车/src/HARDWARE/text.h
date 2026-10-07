#ifndef __TEXT_H__
#define __TEXT_H__	 
 #include "stm32f4xx.h"
// SRT 是string的缩写
#define STR_WIDTH		8		/* 字符宽度 */
#define STR_HEIGHT		16		/* 字符高度 */

void LCD_ShowChar(u16 x,u16 y,u8 num,u8 size,u8 mode,u16 Color);
void LCD_ShowString(u16 x,u16 y,const u8 *p,u16 Color);
void LCD_DrawSquare(u16 x, u16 y, u8 c, u8 k, u16 Color);
void LCD_ShowNumber(u16 x, u16 y, int num, u8 size, u16 Color);
void LCD_ShowFloat(u16 x, u16 y, float num, u8 size, u16 Color);
#endif
