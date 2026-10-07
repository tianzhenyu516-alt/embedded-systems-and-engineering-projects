#include "stdio.h"
#include "text.h"
#include "lcd.h"
#include "ziku.h"
#include "duoji.h"
#include "delay.h"
#include "motor.h"
#include "code.h"
#include "control.h"
#include <math.h>

//这里也是存放摄像头串口通信初始化以及处理数据的代码

u8 Openmv_Column_RxPacket[4]; //存放openmv传回来的物料的数据
u8 Openmv_Column_TxPacket[4];
u8 Openmv_Annular_RxPacket[4];//存放openmv传回来的色环的数据
u8 Openmv_Annular_TxPacket[4];


u32 middle_y;

u8 Column_RxFlag;
u8 Annular_RxFlag;

//openmv串口初始化
void Openmv_Init(void)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitTStructure;
	NVIC_InitTypeDef NVIC_InitStruvture;
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_USART3, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOB, ENABLE);
	
	GPIO_InitStructure.GPIO_Mode    = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_OType   = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_10;//TX
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOB, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_PuPd    = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_11;//RX
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOB, &GPIO_InitStructure);

	GPIO_PinAFConfig(GPIOB,GPIO_PinSource10,GPIO_AF_USART3); 
	GPIO_PinAFConfig(GPIOB,GPIO_PinSource11,GPIO_AF_USART3); 
	
	USART_InitTStructure.USART_BaudRate = 115200;
	USART_InitTStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitTStructure.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
	USART_InitTStructure.USART_Parity = USART_Parity_No;
	USART_InitTStructure.USART_StopBits = USART_StopBits_1;
	USART_InitTStructure.USART_WordLength = USART_WordLength_8b;
	USART_Init(USART3, &USART_InitTStructure);
	
	USART_ITConfig(USART3, USART_IT_RXNE, ENABLE);

	NVIC_InitStruvture.NVIC_IRQChannel = USART3_IRQn;
	NVIC_InitStruvture.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStruvture.NVIC_IRQChannelPreemptionPriority = 1;
	NVIC_InitStruvture.NVIC_IRQChannelSubPriority = 1;
	NVIC_Init(&NVIC_InitStruvture);
	
	USART_Cmd(USART3, ENABLE);
}

void USART3_IRQHandler(void) 
{
	static u8 RxState = 0;
	static u8 pRxPacket = 0;
	if(USART_GetFlagStatus(USART3, USART_FLAG_RXNE) == SET)
	{
		u8 RxData = USART_ReceiveData(USART3);
		
		//等待接受数据包帧头
		if (RxState == 0)	 
		{
			if (RxData == 0xFF)//物料帧头
			{
				RxState = 1;
				pRxPacket = 0;
			}
			if (RxData == 0x01)//色环帧头
			{
				RxState = 3;
				pRxPacket = 0;
			}
			if (RxData == 0x03)//对线帧头
			{
				RxState = 5;
				pRxPacket = 0;
			}
		}
		
		//接受到数据包了，处理数据包
		else if (RxState == 1)
		{	
			
			Openmv_Column_RxPacket[pRxPacket] = RxData;	
			pRxPacket ++;
			if(pRxPacket >=4)
			{
				RxState = 2;
			}
			
		}
		else if (RxState == 3)
		{	
			
			Openmv_Annular_RxPacket[pRxPacket] = RxData;	
			pRxPacket ++;
			if(pRxPacket >=3)
			{
				RxState = 4;
			}
			
		}
		else if (RxState == 5)
		{	
			
			task[pRxPacket] = RxData;	
			pRxPacket ++;
			if(pRxPacket >=2)
			{
				RxState = 6;
			}
			
		}
		
		//数据接受完成
		else if (RxState == 2)
		{
			if (RxData == 0xFE)
			{
//			中断里面不要放显示，里面有delay然后卡死程序的，省赛的时候卡死一次，吃过一次亏
//			LCD_ShowNumber(230, 5, Openmv_Column_RxPacket[0]+ Openmv_Column_RxPacket[1], 24, BLUE);
//			LCD_ShowNumber(230, 25, Openmv_Column_RxPacket[2]+ Openmv_Column_RxPacket[3], 24, BLUE);
				RxState = 0;
				Column_RxFlag = 1;
			}
		}
		else if (RxState == 4)
		{
			if (RxData == 0xFE)
			{
//			中断里面不要放显示，里面有delay然后卡死程序的，省赛的时候卡死一次，吃过一次亏
//			LCD_ShowNumber(280, 1, Openmv_Annular_RxPacket[0] + Openmv_Annular_RxPacket[1], 24, MAGENTA);
//			LCD_ShowNumber(280, 30, Openmv_Annular_RxPacket[2]+ Openmv_Annular_RxPacket[3], 24, MAGENTA);
				RxState = 0;
				Annular_RxFlag = 1;
			}
		}
		else if (RxState == 6)
		{
			if (RxData == 0xFE)
			{
//			LCD_ShowNumber(200, 30, task[1], 24, MAGENTA);
//			LCD_ShowNumber(200, 80, task[0], 24, MAGENTA);
//			LCD_ShowNumber(200, 170, (task[1] - task[0]), 24, MAGENTA);
//      LCD_ShowNumber(280, 170, ((task[1] + task[0])/2), 24, BLUE);
				RxState = 0;
				Column_RxFlag = 1;
			}
		}
		USART_ClearFlag(USART3, USART_FLAG_RXNE);
	}
}

/**
 * @brief 给openmv发送字节
 * 
 * 给openmv发送字节，用来切换模式
 * 
 * @param Byte 需要发送的字节
 *
 */
void Openmv_SendByte(u8 Byte)
{
	USART_SendData(USART3, Byte);
	while(USART_GetFlagStatus(USART3,USART_FLAG_TXE) == RESET);
}

/**
 * @brief 给openmv发送数组
 * 
 * 给openmv发送数组
 * 
 * @param Array  需要发送的数组
 * @param Length 需要发送的数组长度
 */
void Openmv_SendArray(u8 *Array, s16 Length)
{
	u16 i;
	for (i = 0; i < Length; i++)
	{
		Openmv_SendByte(Array[i]);
	}

}

/**
 * @brief 把接受到openmv物料数据发送出去
 * 
 * 把接受到openmv物料数据发送出去，用来调试
 * 
 */
void Openmv_Column_SendPacket(void)
{
	Openmv_SendArray(Openmv_Column_TxPacket, 4);
}

/**
 * @brief 把接受到openmv色环数据发送出去
 * 
 * 把接受到openmv色环数据发送出去，用来调试
 * 
 */
void Openmv_Annular_SendPacket(void)
{
	Openmv_SendArray(Openmv_Annular_TxPacket, 4);
}

/**
 * @brief 初始化色环发送的包
 * 
 * 用来调试
 * 
 */
void Packet_Annular_Init(void)
{
	Openmv_Annular_TxPacket[0] = Openmv_Annular_RxPacket[0];
	Openmv_Annular_TxPacket[1] = Openmv_Annular_RxPacket[1];
	Openmv_Annular_TxPacket[2] = Openmv_Annular_RxPacket[2];
	Openmv_Annular_TxPacket[3] = Openmv_Annular_RxPacket[3];
	
}

/**
 * @brief 初始化物料发送的包
 * 
 * 用来调试
 * 
 */
void Packet_Column_Init(void)
{
	Openmv_Column_TxPacket[0] = Openmv_Column_RxPacket[0];
	Openmv_Column_TxPacket[1] = Openmv_Column_RxPacket[1];
	Openmv_Column_TxPacket[2] = Openmv_Column_RxPacket[2];
	Openmv_Column_TxPacket[3] = Openmv_Column_RxPacket[3];
	
}

/**
 * @brief 物料标志位清零
 * 
 * 接受到物料的数据后，标志位清零
 * 
 */
u8 Column_GetRxFlag(void)
{
	if(Column_RxFlag == 1)
	{
		Column_RxFlag = 0;
		return 1;
	}
	
	return 0;
}

/**
 * @brief 色环标志位清零
 * 
 * 接受到色环的数据后，标志位清零
 * 
 */
u8 Annular_GetRxFlag(void)
{
	if(Annular_RxFlag == 1)
	{
		Annular_RxFlag = 0;
		return 1;
	}
	
	return 0;
}

/**
 * @brief 把接受到openmv物料数据发送出去
 * 
 * 把接受到openmv物料数据发送出去，用来调试
 * 
 */
void Openmv_SendPacket(void)
{
	Openmv_SendArray(Openmv_Column_TxPacket, 4);
}


/**
 * @brief 接受发送
 * 
 * 把接受到openmv数据发送出去，用来调试
 * 
 */
void Receive_Send(void)
{
	if(Column_GetRxFlag() == 1)
	{
		Packet_Column_Init();
		Openmv_SendByte(0xFF);
		Openmv_Column_SendPacket();
		Openmv_SendByte(0xFE);
	}
	if(Annular_GetRxFlag() == 1)
	{
		Packet_Annular_Init();
		Openmv_SendByte(0x01);
		Openmv_Annular_SendPacket();
		Openmv_SendByte(0xFE);
	}
}


