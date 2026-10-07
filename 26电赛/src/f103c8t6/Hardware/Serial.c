#include "stm32f10x.h"                  // Device header
#include "stdio.h"
#include "string.h"
#include "main.h"
uint8_t Serial_RXDat = 0;
uint8_t Serial_State = 0x00;
uint8_t Rece_Length;
uint8_t RXDat_X = 0;
char RXDat_Pack[200] = {0};
void Init_Serial(void)
{
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);	//开启USART1的时钟
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);	//开启GPIOA的时钟

	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitStructure;
	NVIC_InitTypeDef NVIC_InitStructure;
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;     //复用推挽输出
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9 ;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA,&GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IPU;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_10;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOA, &GPIO_InitStructure);
	
	
	USART_InitStructure.USART_BaudRate = 115200; 	    //波特率
	USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;  //是否开启硬件流控制
	USART_InitStructure.USART_Mode = USART_Mode_Tx |USART_Mode_Rx;  //发送。接收
	USART_InitStructure.USART_Parity = USART_Parity_No;   //校验位
	USART_InitStructure.USART_StopBits = USART_StopBits_1;  //停止位长度
	USART_InitStructure.USART_WordLength = USART_WordLength_8b;  //发送长度
	USART_Init(USART1,&USART_InitStructure);

	USART_ITConfig(USART1,USART_IT_RXNE,ENABLE);    //开启串口到NVIC的通道
//	USART_ITConfig(USART3,USART_IT_RXNE,ENABLE);    //开启串口到NVIC的通道
	
	USART_Cmd(USART1,ENABLE);    //打开串口
	
	
	
	NVIC_InitStructure.NVIC_IRQChannel = USART1_IRQn;   //中断通道
	NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 1;
	NVIC_InitStructure.NVIC_IRQChannelSubPriority = 1;
	NVIC_Init(&NVIC_InitStructure);
}

void Serial_SendByte(uint8_t Byte)  //发送一个字节
{
	USART_SendData(USART1,Byte);
	while(USART_GetFlagStatus(USART1,USART_FLAG_TXE) == RESET);
}

void Serial_SendShuzu(uint8_t *Shuzu,uint8_t Length)    //发送数组
{
	uint8_t i;
	for(i=0;i<Length;i++)
	{
		Serial_SendByte(Shuzu[i]);
	}
}

void Sreial_SendString(char *String)     //发送字符串
{
	uint8_t m;
	for(m=0;String[m]!='\0';m++)
	{
		Serial_SendByte(String[m]);
	}
}

uint32_t Y_Xcifang(uint32_t Y,uint8_t X)
{
	uint32_t Result=1;
	while(X--)
	{
		Result *= Y;
	}
	return Result;
}

void Sreial_SendNum(uint32_t Num,uint8_t Length)   //发送数字
{
	uint8_t a;
	for(a=0;a<Length;a++)
	{
		Serial_SendByte(Num/Y_Xcifang(10,Length-a-1) %10  + 0x30);
	}
}

void Serial_SendPack(uint8_t *Shuzu)    //发送HEX数据包
{
	Serial_SendByte(0xFF);
	Serial_SendShuzu(Shuzu,4);
	Serial_SendByte(0xFE);
}


uint8_t Serial_GetRxDat(void)
{
	return Serial_RXDat;
}

/*
 * 解析出recv0_buff中的数据
 * 返回解析得到的数据
 */
float Get_Data(void)
{
    uint8_t data_Start_Num = 0; // 记录数据位开始的地方
    uint8_t data_End_Num = 0; // 记录数据位结束的地方
    uint8_t data_Num = 0; // 记录数据位数
    uint8_t minus_Flag = 0; // 判断是不是负数
	uint8_t dou_flag = 0;
    float data_return = 0; // 解析得到的数据
    for(uint8_t i=0;i<200;i++) // 查找等号和感叹号的位置
    {
        if(RXDat_Pack[i] == '=') data_Start_Num = i ; // +1是直接定位到数据起始位
		if(RXDat_Pack[i] == '.') dou_flag = i;		//确定小数点位置
        if(RXDat_Pack[i] == '!')
        {
            data_End_Num = i;
            break;
        }
    }
    if(RXDat_Pack[data_Start_Num+1] == '-') // 如果是负数
    {
        data_Start_Num += 1; // 后移一位到数据位
		dou_flag+=1;
        minus_Flag = 1; // 负数flag
    }
    data_Num = data_End_Num - data_Start_Num - 1;
    if(data_Num == 5) // 数据共4位
    {
		data_return =(RXDat_Pack[dou_flag - 1]-48)  + (RXDat_Pack[dou_flag+1]-48) * 0.1f + (RXDat_Pack[dou_flag+2]-48) * 0.01f + (RXDat_Pack[dou_flag+3]-48) * 0.001f;
	}
	else if(data_Num == 6)
	{
		data_return =(RXDat_Pack[dou_flag - 2]-48)*10 + (RXDat_Pack[dou_flag - 1]-48)  + (RXDat_Pack[dou_flag+1]-48) * 0.1f + (RXDat_Pack[data_End_Num-1]-48) * 0.01f+ (RXDat_Pack[dou_flag+3]-48) * 0.001f;
	}
    else if(data_Num == 7) // 数据共6位
    {
        data_return = (RXDat_Pack[dou_flag-3]-48)*100 + (RXDat_Pack[dou_flag-2]-48)*10 + (RXDat_Pack[dou_flag-1]-48) +
                (RXDat_Pack[dou_flag+1]-48)*0.1f + (RXDat_Pack[dou_flag+2]-48)*0.01f+ (RXDat_Pack[dou_flag+3]-48) * 0.001f;
    }
	else if(data_Num == 8) // 数据共6位
    {
        data_return = (RXDat_Pack[dou_flag-4]-48)*1000+(RXDat_Pack[dou_flag-3]-48)*100 + (RXDat_Pack[dou_flag-2]-48)*10 + (RXDat_Pack[dou_flag-1]-48) +
                (RXDat_Pack[dou_flag+1]-48)*0.1f + (RXDat_Pack[dou_flag+2]-48)*0.01f+ (RXDat_Pack[dou_flag+3]-48) * 0.001f;
    }
    if(minus_Flag == 1)  data_return = -data_return;
//    printf(".=%d\r\n",(int)dou_flag);
    return data_return;
}


void USART1_IRQHandler(void)
{
	char receivedData = 0;
	uint16_t i=0;
	if(USART_GetITStatus(USART1,USART_IT_RXNE) == SET)    //判断标志位
	{
		receivedData = USART_ReceiveData(USART1);
		Rece_Length++;
		RXDat_Pack[Rece_Length-1] = receivedData;
		USART_ClearITPendingBit(USART1,USART_IT_RXNE);
		if(receivedData == 0x21)
		{
			printf("RXLen=%d\r\n",Rece_Length);
			for(i = 0;i<Rece_Length;i++)
			{
				printf("RXDat_Pack[%d] = %c\r\n",i,RXDat_Pack[i]);
			}
			USART_PID_Adjust(0,RXDat_Pack);
			memset(RXDat_Pack,0,sizeof(RXDat_Pack));
			Rece_Length = 0;
		}
	}
}
#pragma import(__use_no_semihosting)             
//标准库需要的支持函数                 
struct __FILE 
{ 
	int handle; 
}; 

FILE __stdout;       
//定义_sys_exit()以避免使用半主机模式    
void _sys_exit(int x) 
{ 
	x = x; 
}
//重定义fputc函数 
int fputc(int ch, FILE *f)
{      
	while((USART1->SR&0X40)==0);//循环发送,直到发送完毕   
    USART1->DR = (u8) ch;      
	return ch;
}
