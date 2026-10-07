#include "stm32f10x.h"                  // Device header
#include "Delay.h"
#include "stdio.h"
void IIC_Init(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB,ENABLE);
	
	GPIO_InitTypeDef GPIOStructure;
	GPIOStructure.GPIO_Mode = GPIO_Mode_Out_OD;     //开漏输出
	GPIOStructure.GPIO_Pin = GPIO_Pin_10 | GPIO_Pin_11;
	GPIOStructure.GPIO_Speed = GPIO_Speed_50MHz;   //50MHz是端口的输出速度，对按键没多大影响
	GPIO_Init(GPIOB,&GPIOStructure);
	
	GPIO_ResetBits(GPIOB,GPIO_Pin_10 | GPIO_Pin_11);
}

void IIC_W_SCL(uint8_t Value)
{
	GPIO_WriteBit(GPIOB,GPIO_Pin_10,(BitAction)Value);
	Delay_us(10);
}

void IIC_W_SDA(uint8_t Value)
{
	GPIO_InitTypeDef GPIO_INIT;
	GPIO_INIT.GPIO_Mode=GPIO_Mode_Out_PP;
	GPIO_INIT.GPIO_Pin=GPIO_Pin_11 ;
	GPIO_INIT.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOB,&GPIO_INIT);
	GPIO_WriteBit(GPIOB,GPIO_Pin_11,(BitAction)Value);
	Delay_us(10);
}

uint8_t IIC_R_SDA(void)
{
	GPIO_InitTypeDef GPIO_INIT;
	GPIO_INIT.GPIO_Mode=GPIO_Mode_IPU;
	GPIO_INIT.GPIO_Pin=GPIO_Pin_11 ;
	GPIO_INIT.GPIO_Speed=GPIO_Speed_50MHz;
	GPIO_Init(GPIOB,&GPIO_INIT);
	return GPIO_ReadInputDataBit(GPIOB,GPIO_Pin_11);
}

void IIC_Start(void)
{
	IIC_W_SCL(1);   //释放
	IIC_W_SDA(1);	//释放
	IIC_W_SDA(0);	//先拉低SDA，避免中间连续的问题
	IIC_W_SCL(0);	//拉低
}

void IIC_Stop(void)
{
	IIC_W_SDA(0);
	IIC_W_SCL(1);
	IIC_W_SDA(1);
}

void IIC_SendByte(uint8_t Byte)
{
	uint8_t i;
	for(i=0;i<8;i++)
	{
		IIC_W_SDA(Byte & (0x80>>i));
		IIC_W_SCL(1);
		IIC_W_SCL(0);
	}
}

uint8_t IIC_ReceiveByte(void)
{
	uint8_t i,Byte = 0x00;
	IIC_W_SDA(1);

	for(i=0;i<8;i++)
	{
		IIC_W_SCL(1);
		if(IIC_R_SDA() == 1) {Byte |= (0x80>>i);}
		IIC_W_SCL(0);
	}
	return Byte;
}

void IIC_SendAck(uint8_t AckBit)
{
	IIC_W_SDA(AckBit);
	IIC_W_SCL(1);
	IIC_W_SCL(0);
}

uint8_t IIC_ReceiveAck(void)
{
	uint8_t AckBit = 1;
	IIC_W_SDA(1);
	IIC_W_SCL(1);
	AckBit = IIC_R_SDA();
	IIC_W_SCL(0);
	return AckBit;
}

/***************IIC遍历地址****************/
void IIC_Read_Addr(void)
{
//	uint8_t addr = 0;
//	uint8_t ack = 1;
//	for(addr = 0;addr < 255;addr++)
//	{
//		IIC_Start();
//		IIC_SendByte(addr);
//		ack = IIC_ReceiveAck();
//		if(ack == 0)
//		{
//			printf("addr = %X\r\n",addr);
//		}
//		ack = 1;
//		IIC_Stop();
//	}
//	IIC_Start();
	
	printf("Search is OK!\r\n");
}
