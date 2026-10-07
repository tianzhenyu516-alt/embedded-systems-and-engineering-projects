#ifndef __LCD_H
#define __LCD_H		

#include "stm32f4xx.h"
#include "stdlib.h"
	  
#define Horizontal_or_Vertical  1	//定义是否使用横屏 		0,不使用.1,使用.
 #if Horizontal_or_Vertical==1
#define LCD_W 320
#define LCD_H 240
 #define MAX_CHAR_POSX 312
 #define MAX_CHAR_POSY 232 

#define L2R_U2D  (0<<5)|(1<<4)|(1<<3);  //从左到右,从上到下
#define L2R_D2U  (0<<5)|(0<<4)|(1<<3); //从左到右,从下到上
#define R2L_U2D  (0<<5)|(0<<4)|(0<<3);//从右到左,从上到下
#define R2L_D2U  (1<<5)|(0<<4)|(1<<3); //从右到左,从下到上

#define U2D_L2R  (0<<5)|(1<<4)|(0<<3); //从上到下,从左到右
#define U2D_R2L  (1<<5)|(1<<4)|(0<<3);//从上到下,从右到左
#define D2U_L2R  (0<<5)|(0<<4)|(0<<3); //从下到上,从左到右
#define D2U_R2L  (1<<5)|(0<<4)|(0<<3); //从下到上,从右到左
#else     
#define LCD_W 240
#define LCD_H 320
// #define MAX_CHAR_POSX 232
// #define MAX_CHAR_POSY 312


#define L2R_U2D  (1<<5)|(1<<4)|(0<<3);  //从左到右,从上到下
#define L2R_D2U  (0<<5)|(1<<4)|(0<<3); //从左到右,从下到上
#define R2L_U2D  (1<<5)|(0<<4)|(0<<3);//从右到左,从上到下
#define R2L_D2U  (0<<5)|(0<<4)|(0<<3); //从右到左,从下到上

#define U2D_L2R  (0<<5)|(0<<4)|(0<<3); //从上到下,从左到右
#define U2D_R2L  (1<<5)|(0<<4)|(1<<3);//从上到下,从右到左
#define D2U_L2R  (0<<5)|(1<<4)|(1<<3); //从下到上,从左到右
#define D2U_R2L  (0<<5)|(0<<4)|(1<<3); //从下到上,从右到左
#endif
  

//LCD的画笔颜色和背景色	   
extern u16  POINT_COLOR;//默认红色    
extern u16  BACK_COLOR; //背景颜色.默认为白色


//////////////////////////////////////////////////////////////////////////////////	 
//-----------------LCD端口定义---------------- 
#define	LCD_LED GPIO_SetBits(GPIOB,GPIO_Pin_15) //LCD背光    		 PB0 	   

//LCD地址结构体
typedef struct
{
	u16 LCD_REG;
	u16 LCD_RAM;
} LCD_TypeDef;


//使用NOR/SRAM的 Bank1.sector4,地址位HADDR[27,26]=11 A10作为数据命令区分线 
//注意设置时STM32内部会右移一位对其! 111110=0X3E			    
#define LCD_BASE        ((u32)(0x6C000000 | 0x0000007E))
#define LCD             ((LCD_TypeDef *) LCD_BASE)


#define WHITE         	 0xFFFF
#define BLACK         	 0x0000	  
#define BLUE         	 0x001F  
#define BRED             0XF81F
#define GRED 			 0XFFE0
#define GBLUE			 0X07FF
#define RED           	 0xF800
#define MAGENTA       	 0xF81F
#define GREEN         	 0x07E0
#define CYAN          	 0x7FFF
#define YELLOW        	 0xFFE0
#define BROWN 			 0XBC40 //棕色
#define BRRED 			 0XFC07 //棕红色
#define GRAY  			 0X8430 //灰色
#define DARKBLUE      	 0X01CF	//深蓝色
#define LIGHTBLUE      	 0X7D7C	//浅蓝色  
#define GRAYBLUE       	 0X5458 //灰蓝色
#define LIGHTGREEN     	 0X841F //浅绿色
#define LGRAY 			 0XC618 //浅灰色(PANNEL),窗体背景色
#define LGRAYBLUE        0XA651 //浅灰蓝色(中间层颜色)
#define LBBLUE           0X2B12 //浅棕蓝色(选择条目的反色)
	    															  
void LCD_WR_REG(u16 regval);
void LCD_WR_DATA(u16 data);
u16 LCD_RD_DATA(void);
void LCD_WriteReg(u16 LCD_Reg, u16 LCD_RegValue);
u16 LCD_ReadReg(u16 LCD_Reg);
void LCD_WriteRAM_Prepare(void);
void LCD_WriteRAM(u16 RGB_Code);
void LCD_Display(u8 off_on);
void LCD_SetCursor(u16 Xpos, u16 Ypos);
void LCD_Scan_Dir(void);
void LCD_Init(void);
void LCD_Clear(u16 color);
void LCD_DrawPoint(u16 x,u16 y,u16 Color);
#endif  
	 
	 



