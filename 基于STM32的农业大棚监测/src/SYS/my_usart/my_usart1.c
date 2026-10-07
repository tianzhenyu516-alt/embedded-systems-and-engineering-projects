/****************重要说明**************
使用此程序需要添加

#include "stdio.h"      
#include "stdarg.h"		
#include "string.h"

这三个头文件
**********************************/

#include "sys.h"

void My_USART1(void)
{
	GPIO_InitTypeDef  GPIO_InitStrue;
	USART_InitTypeDef USART1_InitStrue;
	
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA, ENABLE);
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);
	
	GPIO_InitStrue.GPIO_Mode=GPIO_Mode_AF_PP;
	GPIO_InitStrue.GPIO_Pin=USART1_GPIO_PIN_TX;
	GPIO_InitStrue.GPIO_Speed=GPIO_Speed_10MHz;		
	GPIO_Init(GPIOA,&GPIO_InitStrue);
	
	GPIO_InitStrue.GPIO_Mode=GPIO_Mode_IN_FLOATING;
	GPIO_InitStrue.GPIO_Pin=USART1_GPIO_PIN_RX;//PA10		
	GPIO_Init(GPIOA,&GPIO_InitStrue);
	
	USART1_InitStrue.USART_BaudRate=115200;
	USART1_InitStrue.USART_HardwareFlowControl=USART_HardwareFlowControl_None;
	USART1_InitStrue.USART_Mode=USART_Mode_Rx|USART_Mode_Tx;
	USART1_InitStrue.USART_Parity=USART_Parity_No;
	USART1_InitStrue.USART_StopBits=USART_StopBits_1;
	USART1_InitStrue.USART_WordLength=USART_WordLength_8b;
	
	USART_Init(USART1,&USART1_InitStrue);	
	
	
   	USART_ITConfig(USART1,USART_IT_RXNE,ENABLE);//接收中断
	  USART_Cmd(USART1,ENABLE);	

}

void USART_SendByte(USART_TypeDef* USARTx, uint16_t Data)
{
  /* Check the parameters */
  assert_param(IS_USART_ALL_PERIPH(USARTx));
  assert_param(IS_USART_DATA(Data)); 
    
  /* Transmit Data */
  USARTx->DR = (Data & (uint16_t)0x01FF);
  while (USART_GetFlagStatus(USARTx, USART_FLAG_TXE) == RESET);

}


__align(8) char USART1_TxBuff[256];  

void u1_printf(char* fmt,...) 
{  
	unsigned int i =0,length=0;
	
	va_list ap;
	va_start(ap,fmt);
	vsprintf(USART1_TxBuff,fmt,ap);
	va_end(ap);
	
	length=strlen((const char*)USART1_TxBuff);
	while(i<length)
	{
		USART_SendByte(USART1,USART1_TxBuff[i]);		
		i++;		
	}
	while(USART_GetFlagStatus(USART1,USART_FLAG_TC)==RESET);
	
}
//串口中断
void USART1_IRQHandler(void)
{
    uint8_t res;
    if(USART_GetITStatus(USART1,USART_IT_RXNE) != RESET)  //判断是否发生中断
        {
            USART_ClearITPendingBit(USART1,USART_IT_RXNE);  //清除当前中断标志位
            res =USART_ReceiveData(USART1);	
		        USART_SendData(USART1,res);//??

//		if(res=='A')
//			{
//		  LED_AllOn();
//			}				
//		if(res=='B')
//			{
//			LED_AllOff();
//			}
	}
}





//
//void xiaoai_test(void){
//	if(USART_ReceiveData(USART1)=='A')
//			{
//			LED1_ON;
//			}				
//				if(USART_ReceiveData(USART1)=='B')
//			{	
//			LED1_OFF;
//			}			
//       if(USART_ReceiveData(USART1)=='C')
//			{
//			BEEP_ON;
//			}			
//       if(USART_ReceiveData(USART1)=='D')
//			{
//			BEEP_OFF;
//			}			
//		}
