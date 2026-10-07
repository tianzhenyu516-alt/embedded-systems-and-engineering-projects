#include "string.h"
#include "text.h"
#include "lcd.h"
#include "jy62.h"
#include "zhi.h"
//HWT101陀螺仪代码 头文件名字懒得改了哈哈哈
u8 hwt[5] = {0xFF, 0xAA, 0x48, 0x01, 0x00};
//下面改用V831摄像头识别中间正方形了
u8 hwt101[22];
u8 v831_y[3];		//数组存放V831的数据
u8 v831_RxFlag; //V831串口接受标志位
u8 hwt_RxFlag = 0; 
//jy62初始化
//配置定时器4
void TIM4_Config(void) 
	{
    // 1. 使能TIM4时钟
    RCC->APB1ENR |= RCC_APB1ENR_TIM4EN;
    
    // 2. 设置定时器的计数频率
    TIM4->PSC = 83;    // 预分频器：TIM4时钟 = 84MHz / (83 + 1) = 1MHz
    TIM4->ARR = 999;    // 自动重装载值：计数1000次，每次中断间隔 = 10kHz / 1000 = 10Hz（即0.1秒）
    
    // 3. 使能更新中断
    TIM4->DIER |= TIM_DIER_UIE; // 使能更新中断（即计数溢出中断）
    
    // 4. 开启TIM4定时器
    TIM4->CR1 |= TIM_CR1_CEN; // 使能定时器
    
    // 5. 配置NVIC，启用TIM4中断
    NVIC_SetPriority(TIM4_IRQn, 1); // 设置中断优先级
    NVIC_EnableIRQ(TIM4_IRQn);      // 使能TIM4中断
}
	// TIM4 中断服务程序


void TIM4_IRQHandler(void) {
    // 检查是否是更新中断
    if (TIM4->SR & TIM_SR_UIF) {
        // 清除中断标志位
        TIM4->SR &= ~TIM_SR_UIF;
        
        // 在此处执行定时任务，比如读取偏航角
        yaw=(float)(hwt101[18]<<8|hwt101[17])/32768*180; // 获取偏航角并存储在全局变量中
    }
}


//jy62初始化
void jy62_init(void)
{
	GPIO_InitTypeDef GPIO_InitStructure;
	USART_InitTypeDef USART_InitTStructure;
	NVIC_InitTypeDef NVIC_InitStruvture;
	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	
	RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART6, ENABLE);
	RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOG, ENABLE);
	
	GPIO_InitStructure.GPIO_Mode    = GPIO_Mode_AF;
	GPIO_InitStructure.GPIO_OType   = GPIO_OType_PP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_14;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOG, &GPIO_InitStructure);
	
	GPIO_InitStructure.GPIO_PuPd    = GPIO_PuPd_UP;
	GPIO_InitStructure.GPIO_Pin = GPIO_Pin_9;
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(GPIOG, &GPIO_InitStructure);
	
	GPIO_PinAFConfig(GPIOG,GPIO_PinSource14,GPIO_AF_USART6);
	GPIO_PinAFConfig(GPIOG,GPIO_PinSource9,GPIO_AF_USART6); 

	USART_InitTStructure.USART_BaudRate = 115200;
	USART_InitTStructure.USART_HardwareFlowControl = USART_HardwareFlowControl_None;
	USART_InitTStructure.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;
	USART_InitTStructure.USART_Parity = USART_Parity_No;
	USART_InitTStructure.USART_StopBits = USART_StopBits_1;
	USART_InitTStructure.USART_WordLength = USART_WordLength_8b;
	USART_Init(USART6, &USART_InitTStructure);

	USART_ITConfig(USART6, USART_IT_RXNE, ENABLE);
	
	NVIC_InitStruvture.NVIC_IRQChannel = USART6_IRQn;
	NVIC_InitStruvture.NVIC_IRQChannelCmd = ENABLE;
	NVIC_InitStruvture.NVIC_IRQChannelPreemptionPriority = 2;
	NVIC_InitStruvture.NVIC_IRQChannelSubPriority = 2;
	NVIC_Init(&NVIC_InitStruvture);

	USART_Cmd(USART6, ENABLE);
}

void USART6_IRQHandler(void) 
{
	
 
	if(USART_GetFlagStatus(USART6, USART_FLAG_RXNE) == SET)
	{
		u8 RxData = USART_ReceiveData(USART6);
		hwt101[hwt_RxFlag++]= RxData ;
		if(hwt_RxFlag>21)
			hwt_RxFlag=0;
		//等待接受数据包帧头
//		if (RxState == 0)	 
//		{
//			if (RxData == 0x03)
//			{
//				RxState = 1;
//				pRxPacket = 0;
//			}
//		}
//		//接受到数据包了，处理数据包
//		else if (RxState == 1)
//		{	
//			v831_y[pRxPacket] = RxData;	
//			pRxPacket ++;
//			if(pRxPacket >=2)
//			{
//				RxState = 2;
//			}
//			
//		}
//		//数据接受完成
//		else if (RxState == 2)
//		{
//			if (RxData == 0xFE)
//			{
////			中断里面不要放显示，里面有delay然后卡死程序的，省赛的时候卡死一次，吃过一次亏
////			LCD_ShowNumber(200, 30, v831_y[1], 24, MAGENTA);
////			LCD_ShowNumber(200, 80, v831_y[0], 24, MAGENTA);
////			LCD_ShowNumber(200, 170, (v831_y[1] - v831_y[0]), 24, MAGENTA);
//				RxState = 0;
//				v831_RxFlag = 1;
//			}
//		}
		USART_ClearFlag(USART6, USART_FLAG_RXNE);
	}
}

/**
 * @brief 给V831发送字节
 * 
 * 给V831发送字节，用来调试的
 * 
 * @param Byte 需要发送的字节
 *
 */
void v831_SendByte(u8 Byte)
{
	USART_SendData(USART6, Byte);
	while(USART_GetFlagStatus(USART6,USART_FLAG_TXE) == RESET);
	
}
/**
 * @brief 给V831发送数组
 * 
 * 给V831发送数组
 * 
 * @param Array  需要发送的数组
 * @param Length 需要发送的数组长度
 */
void V831_SendArray(u8 *Array, s16 Length)
{
	u16 i;
	for (i = 0; i < Length; i++)
	{
		v831_SendByte(Array[i]);
	}

}
