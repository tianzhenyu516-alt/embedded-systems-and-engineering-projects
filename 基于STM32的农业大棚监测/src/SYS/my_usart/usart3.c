#include "usart3.h"
#include <string.h>
#include "stdarg.h"
/*
******串口3初始化*****************************************
*	函数功能:	串口3初始化
*	入口参数:	baud:设定波特率
*	返回参数:	无
*	说明:		TX-PB10		RX-PB11
**********************************************************
*/
#define  RECEIVE_BUF_SIZE   8
uint8_t WindRxFlag = 0;							// 串口3接收标志0-未接受1-接收
uint8_t  WindReceiveBuff[RECEIVE_BUF_SIZE];   	// 串口3接收缓冲
uint16_t WindRxLen = 0;							// 串口3接收长度
uint8_t WindDecid=0;
float WindVelocity=0;//风速
//串口接收缓存区 	
u8 USART3_RX_BUF[USART3_MAX_RECV_LEN]; 				//接收缓冲,最大USART3_MAX_RECV_LEN个字节.
u8 USART3_Cach_BUF[USART3_MAX_RECV_LEN];     //接收缓冲,最大USART_REC_LEN个字节.
u8 USART3_TX_BUF[USART3_MAX_SEND_LEN]; 			  //发送缓冲,最大USART3_MAX_SEND_LEN字节
u8  USART3_RX_Count=0;
//通过判断接收连续2个字符之间的时间差不大于10ms来决定是不是一次连续的数据.
//如果2个字符接收间隔超过10ms,则认为不是1次连续数据.也就是超过10ms没有接收到
//任何数据,则表示此次接收完毕.
//接收到的数据状态
//[15]:0,没有接收到数据;1,接收到了一批数据.
//[14:0]:接收到的数据长度
vu16 USART3_RX_STA=0;  


void Usart3_Init(unsigned int baud)
{
		GPIO_InitTypeDef GPIO_InitStructure;                         
		USART_InitTypeDef USART_InitStructure;
		NVIC_InitTypeDef NVIC_InitStructure;
		
		RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB , ENABLE);
		RCC_APB1PeriphClockCmd(RCC_APB1Periph_USART3 , ENABLE); 
		
		GPIO_InitStructure.GPIO_Pin = GPIO_Pin_10;               
		GPIO_InitStructure.GPIO_Mode = GPIO_Mode_AF_PP;
		GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
		GPIO_Init(GPIOB , &GPIO_InitStructure);
		
		GPIO_InitStructure.GPIO_Pin = GPIO_Pin_11;             
		GPIO_InitStructure.GPIO_Mode = GPIO_Mode_IN_FLOATING;
		GPIO_Init(GPIOB , &GPIO_InitStructure);
		
		USART_InitStructure.USART_BaudRate = baud;               
		USART_InitStructure.USART_WordLength = USART_WordLength_8b;
		USART_InitStructure.USART_StopBits = USART_StopBits_1;
		USART_InitStructure.USART_Parity = USART_Parity_No;
		USART_InitStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
		USART_InitStructure.USART_Mode = USART_Mode_Rx | USART_Mode_Tx;
		                  
		
		NVIC_InitStructure.NVIC_IRQChannel = USART3_IRQn;         
		NVIC_InitStructure.NVIC_IRQChannelPreemptionPriority = 0; 
		NVIC_InitStructure.NVIC_IRQChannelSubPriority = 2;       
		NVIC_InitStructure.NVIC_IRQChannelCmd = ENABLE;         
		NVIC_Init(&NVIC_InitStructure);                         
		
		USART_ITConfig(USART3, USART_IT_RXNE, ENABLE);  
        USART_Init(USART3,&USART_InitStructure);         
		USART_Cmd(USART3,ENABLE);
      
        USART3_RX_STA=0;		//清零
	

}


void USART3_IRQHandler(void)
{
    uint8_t Res;
    if(USART_GetITStatus(USART3,USART_IT_RXNE) != RESET)  //判断是否发生中断
    {
        
        Res=USART_ReceiveData(USART3);
			
			if(Res == 'a'){

                OperateMode = 1;
							System.ClearFlag=1;
			}
			if(Res == 'b'||Res == 'i'){

                OperateMode = 0;
							System.ClearFlag=1;
			}
				if(Res == 'h'){

                OperateMode = 2;
							System.ClearFlag=1;
			}
			
			
			
			if(Res == 'c'){

                System.Switch1 = !System.Switch1;
							
			}
			if(Res == 'd'){

             System.Switch2 = !System.Switch2;
			}
			if(Res == 'e'){

              System.Switch3 = !System.Switch3;
			}
			
			if(Res == 'f'){

              System.Switch4 = !System.Switch4;
			}
			if(Res == 'g'){

              System.Switch5 = !System.Switch5;
			}
			
			
			
			
			
		 if (Res == 'j') {
               
                Threshold.TempMax = Threshold.TempMax--;
            }

            if (Res == 'k') {
               
                Threshold.TempMax = Threshold.TempMax++;
            }

            if (Res == 'l') {
               
                Threshold.HumiMin = Threshold.HumiMin--;
            }

            if (Res == 'm') {
               
                Threshold.HumiMin = Threshold.HumiMin++;
            }

            if (Res == 'n') {
               
                Threshold.SmogMax = Threshold.SmogMax--;
            }

            if (Res == 'o') {
             
                Threshold.SmogMax = Threshold.SmogMax++;
            }

            if (Res == 'p') {
            
                Threshold.LightMin = Threshold.LightMin--;
            }

            if (Res == 'q') {
               
                Threshold.LightMin = Threshold.LightMin++;
            }

            if (Res == 'r') {
            
                Threshold.SGP30Max = Threshold.SGP30Max--;
            }

            if (Res == 's') {
            
                Threshold.SGP30Max = Threshold.SGP30Max++;
            }
			
			
			
			
			
			
			Res = '\0';
        USART_ClearITPendingBit(USART3, USART_IT_RXNE);
    }


}



void WindRx_Handel(void)
{
    uint16_t crc;
    if(USART3_RX_STA)
    {
//        printf("WindRx:");
//        for(int i=0;i<7;i++)
//        {
//            printf("%x ",WindReceiveBuff[i]);
//        }
//        printf("\r\n");
            crc= Crc16(WindReceiveBuff,7);
            if(crc==0)
                {
//                    SensorData.WindVel=WindReceiveBuff[3]<<8;
//                    SensorData.WindVel+=WindReceiveBuff[4];
//                    SensorData.WindVel=SensorData.WindVel*0.1;
//                    printf("WindVelocity:%f\r\n",SensorData.WindVel);
                    
                    if(WindReceiveBuff[4]==1) WindDecid=1;
                    else WindDecid=0;
                }
//            printf("crc:%d\r\n",crc);

            USART3_RX_STA = 0;
            WindRxLen = 0;
            memset(WindReceiveBuff, 0x00, sizeof(WindReceiveBuff));
    }
//    printf("WindVelocity:%d\r\n",WindVelocity);
}

///*
//******串口发送单字节*****************************************
//*	函数功能:	串口发送单字节
//*	入口参数:	pUSARTx:串口号
//						ch：需要发送的字节
//*	返回参数:	无
//**********************************************************
//*/
void Usart_SendByte( USART_TypeDef * pUSARTx, uint8_t ch)
{
    /* 发送一个字节数据到USART */
    USART_SendData(pUSARTx,ch);

    /* 等待发送数据寄存器为空 */
    while (USART_GetFlagStatus(pUSARTx, USART_FLAG_TXE) == RESET);
}



///*
//******串口发送多字节*****************************************
//*	函数功能:	串口发送单字节
//*	入口参数:	pUSARTx:串口号
//				Buffer：需要发送的数组的指针
//              Length：需要发送的数组的长度
//*	返回参数:	无
//**********************************************************
//*/
void Usart_SendBytes( USART_TypeDef * pUSARTx, uint8_t *Buffer, uint8_t Length)
{
    uint8_t i=0;
    while(i<Length)
        {
//            if(i<(Length-1))
//                Buffer[Length-1]+=Buffer[i];//累加Length-1前的数据
            Usart_SendByte(pUSARTx,Buffer[i++]);
        }

}



///*
//******串口发送字符串*****************************************
//*	函数功能:	串口发送字符串
//*	入口参数:	pUSARTx:串口号
//						str:需要发送的字符串的首地址
//*	返回参数:	无
//**********************************************************
//*/
//void Usart_SendString( USART_TypeDef * pUSARTx, char *str)
//{
//    unsigned int k=0;
//    do
//  	{
//        Usart_SendByte( pUSARTx, *(str + k) );
//      	k++;
//  	} while(*(str + k)!='\0');
//  	/* 等待发送完成 */
//  	while(USART_GetFlagStatus(pUSARTx,USART_FLAG_TC)==RESET)
//  	{}
//}


/* CRC16 余式表 */
static uint16_t crctalbeabs[] =
{
    0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
    0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400
};


/*!
 *  功  能: CRC16校验
 *  param1: 指向要校验的数据的指针
 *  param2: 要校验的数据的长度
 *  retval: 校验所得到的值，uint16_t 类型
 *
 *  说  明: 本次CRC校验为查表法，多项式为 x16+x15+x2+1(0x8005)，CRC的初始值为0xFFFF
 */
uint16_t Crc16(uint8_t *ptr, uint32_t len)
{
    uint16_t crc = 0xffff;
    uint32_t i;
    uint8_t ch;

    for (i = 0; i < len; i++)
        {
            ch = *ptr++;
            crc = crctalbeabs[(ch ^ crc) & 15] ^ (crc >> 4);
            crc = crctalbeabs[((ch >> 4) ^ crc) & 15] ^ (crc >> 4);
        }

    return crc;
}


__align(8) char USART3_TxBuff[128];  

void u3_printf(char* fmt,...) 
{  
	unsigned int i =0,length=0;
	
	va_list ap;
	va_start(ap,fmt);
	vsprintf(USART3_TxBuff,fmt,ap);
	va_end(ap);
	
	length=strlen((const char*)USART3_TxBuff);
	while(i<length)
	{
		Usart_SendByte(USART3,USART3_TxBuff[i]);		
		i++;		
	}
	while(USART_GetFlagStatus(USART3,USART_FLAG_TC)==RESET);
	
}
