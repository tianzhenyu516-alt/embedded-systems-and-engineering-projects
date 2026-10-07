#include "stdio.h"
#include "text.h"
#include "lcd.h"
#include "ziku.h"
#include "code.h"

//这里是存放二维码模块串口通信初始化以及处理二维码数据的代码

u8 Code_RxPacket[7]={0};
u8 Code_TxPacket[7];
u8 ckbz=0;
u8 Code_RxFlag;

void Code_Init(void)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitTStructure;
	NVIC_InitTypeDef NVIC_InitStruvture;
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	
	RCC_APB1PeriphClockCmd(RCC_APB1Periph_USART2, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOA, ENABLE);

	GPIO_InitStructure.GPIO_Mode    = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_OType   = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_2;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_PuPd    = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_3;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);
	
	
	GPIO_PinAFConfig(GPIOA,GPIO_PinSource2,GPIO_AF_USART2); 
	GPIO_PinAFConfig(GPIOA,GPIO_PinSource3,GPIO_AF_USART2); 

	USART_InitTStructure.USART_BaudRate = 115200;
	USART_InitTStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitTStructure.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
	USART_InitTStructure.USART_Parity = USART_Parity_No;
	USART_InitTStructure.USART_StopBits = USART_StopBits_1;
	USART_InitTStructure.USART_WordLength = USART_WordLength_8b;
	USART_Init(USART2, &USART_InitTStructure);
	
	USART_ITConfig(USART2, USART_IT_RXNE, ENABLE);
	
	NVIC_InitStruvture.NVIC_IRQChannel = USART2_IRQn;
	NVIC_InitStruvture.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStruvture.NVIC_IRQChannelPreemptionPriority = 1;
	NVIC_InitStruvture.NVIC_IRQChannelSubPriority = 1;
	NVIC_Init(&NVIC_InitStruvture);
__enable_irq();
	USART_Cmd(USART2, ENABLE);
}

//下面注释跟openmv.c里面的差不多，可以去看看
void Code_SendByte(u8 Byte)
{
	USART_SendData(USART2, Byte);
	while(USART_GetFlagStatus(USART2,USART_FLAG_TXE) == RESET);
}


void Code_SendArray(u8 *Array, s16 Length)
{
	
	u16 i;
	Code_SendByte(0x3d);
	for (i = 0; i < Length; i++)
	{
		Code_SendByte(Array[i]);
	}
	

}


void Code_SendPacket(void)
{
	Code_SendArray(Code_RxPacket, 7);
}

void Code_Packet_Init(void)
{
	Code_TxPacket[0] = Code_RxPacket[0];
	Code_TxPacket[1] = Code_RxPacket[1];
	Code_TxPacket[2] = Code_RxPacket[2];
	Code_TxPacket[3] = Code_RxPacket[3];
	Code_TxPacket[4] = Code_RxPacket[4];
	Code_TxPacket[5] = Code_RxPacket[5];
	Code_TxPacket[6] = Code_RxPacket[6];
	
}

u8 Code_GetRxFlag(void)
{
	if(Code_RxFlag == 1)
	{
		Code_RxFlag = 0;
		return 1;
	}
	
	return 0;

}

void USART2_IRQHandler(void) 
{
	static u8 pRxPacket = 0;
	ckbz++;
	if(USART_GetITStatus(USART2, USART_IT_RXNE) == SET)
	{
		u8 RxData = USART_ReceiveData(USART2);
		Code_RxPacket[pRxPacket] = RxData;
		pRxPacket ++;
		if(pRxPacket >=8)
		{
			pRxPacket = 0;
			Code_RxFlag = 1;
		}
USART_ClearITPendingBit(USART2, USART_IT_RXNE);
	}
}






