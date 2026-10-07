#include "usart_lcd.h" 
#include "stdio.h"
#include "text.h"
#include "lcd.h"
#include "ziku.h"
#include "duoji.h"
#include "delay.h"
#include "motor.h"
#include "code.h"
#include <math.h>


//此代码是串口屏代码
int test_num = 0;
float test_float = 0;
//加入以下代码,支持printf函数,而不需要选择use MicroLIB	  


void usar_lcd_init()  //串口1初始化
{
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitTStructure;
	NVIC_InitTypeDef NVIC_InitStruvture;
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOB, ENABLE);
	
	GPIO_InitStructure.GPIO_Mode    = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_OType   = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_6;//TX
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOB, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_PuPd    = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_7;//RX
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOB, &GPIO_InitStructure);
	
	GPIO_PinAFConfig(GPIOB,GPIO_PinSource6,GPIO_AF_USART1);
	GPIO_PinAFConfig(GPIOB,GPIO_PinSource7,GPIO_AF_USART1); 

	USART_InitTStructure.USART_BaudRate = 9600;
	USART_InitTStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitTStructure.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
	USART_InitTStructure.USART_Parity = USART_Parity_No;
	USART_InitTStructure.USART_StopBits = USART_StopBits_1;
	USART_InitTStructure.USART_WordLength = USART_WordLength_8b;
	USART_Init(USART1, &USART_InitTStructure);

	USART_ITConfig(USART1, USART_IT_RXNE, ENABLE);
	
	NVIC_InitStruvture.NVIC_IRQChannel = USART1_IRQn;
	NVIC_InitStruvture.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStruvture.NVIC_IRQChannelPreemptionPriority = 2;
	NVIC_InitStruvture.NVIC_IRQChannelSubPriority = 2;
	NVIC_Init(&NVIC_InitStruvture);

	USART_Cmd(USART1, ENABLE);
}


void HMI_send_string(char* name, char* showdata) //串口发送字符串
{
    // printf("t0.txt=\"%d\"\xff\xff\xff", num);
    printf("%s=\"%s\"\xff\xff\xff", name, showdata);
}
void HMI_send_number(char* name, int num)        //串口发送数字
{
    // printf("t0.txt=\"%d\"\xff\xff\xff", num);
    printf("%s=%d\xff\xff\xff", name, num);
}
void HMI_send_float(char* name, float num)       //串口发送浮点数
{
    // printf("t0.txt=\"%d\"\xff\xff\xff", num);
    printf("%s=%d\xff\xff\xff", name, (int)(num * 100));
}

void HMI_send()
{  
	char display_char[2]; // 用于存放要显示的字符，注意：字符数组长度为2，因为要存放一个字符 + 终结符'\0'
    display_char[0] = Code_RxPacket[3];  // 将 Code_RxPacket[3] (即 0x2B) 存入字符数组
    display_char[1] = '\0';              // 终结符，确保是一个有效的字符串
	  HMI_send_number("n0.val",Code_RxPacket[0] - '0');//Code_RxPacket[0]
		HMI_send_number("n1.val",Code_RxPacket[1] - '0');//Code_RxPacket[1]
		HMI_send_number("n2.val",Code_RxPacket[2] - '0');//Code_RxPacket[2]
		HMI_send_string("t0.txt",display_char);//Code_RxPacket[3]
		HMI_send_number("n3.val",Code_RxPacket[4] - '0');//Code_RxPacket[4]
		HMI_send_number("n4.val",Code_RxPacket[5] - '0');//Code_RxPacket[5]
		HMI_send_number("n5.val",Code_RxPacket[6] - '0');//Code_RxPacket[6]
}	
//参考演示    
//                HMI_send_string("t0.txt", "test_num"); 中间的加号
//                HMI_send_float("n0.val", test_float);  左边的数
//                HMI_send_number("n1.val", test_num);   右边的数
void USART1_IRQHandler(void)
{
    if (USART1->SR & USART_SR_RXNE)  // 如果接收到数据
    {
        uint8_t data = USART1->DR;   // 读取数据
        // 这里可以根据需要做一些处理
    }
}

#if 1
#pragma import(__use_no_semihosting)             
//±ê×??aDèòaμ??§3?oˉêy                 
struct __FILE 
{ 
	int handle; 

}; 

FILE __stdout;       
 
_sys_exit(int x) 
{ 
	x = x; 
} 

int fputc(int ch, FILE *f)
{      
	while((USART1->SR & 0x40) == 0); // 等待发送完成标志位
	USART1->DR = (uint8_t)ch;       // 发送字符
	return ch;
}
#endif 

