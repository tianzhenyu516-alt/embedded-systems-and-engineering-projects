#include "stm32f1xx_hal.h"
#include "main.h"
#include "usart.h"
#include "gpio.h"
#include "tim.h"

/* USER CODE BEGIN Includes */

#include "OlED.h"
#include "Individual_Key.h"
#include "Delay.h"
#include "stdio.h"
#include "My_main.h"

#define Vision_Zero_X  28+1.5+2  
#define Vision_Zero_Y  36+1


/*

代码说明：

1、Motor_SetStep_XXX 为步进电机驱动函数，且进行了现实坐标标定，传入的参数为现实毫米坐标。函数中Step*100/2.508后及得出步进实际脉冲数。
2、脉冲产生用IO口翻转加延时方案，因为仅面对三子棋项目来说，移动棋子时无需进行其他任务，所以让单片机一直处于阻塞式延时和IO翻转状态是不影响项目其他状态和效果的。
   但理论上用高级定时器更加规范，不会浪费单片机软件资源。
3、电机驱动函数中夹带一个电机速度梯形算法，这也是为什么直接用延时和IO翻转产生脉冲，因为算法更好实现。
4、第一问与视觉的通信逻辑相较于后面几问有些区别，后五问的逻辑完全一致。第一问还未来得及优化，但不影响实际效果。

*/





typedef struct{
	
	uint8_t Chess_S;//棋子标志位，保存棋子为白棋还是黑棋状态
    uint16_t Chess_X;//棋子X坐标
	uint16_t Chess_Y;//棋子Y坐标
	uint16_t Chess_Board_X;//棋盘棋格X坐标
	uint16_t Chess_Board_Y;//棋盘棋格Y坐标
	
}Chess_XY_Struct,*P_Chess_XY;

int16_t Temp_Step_X,Temp_Step_Y;
uint16_t Count;
uint8_t KeyNum;
uint8_t UART_Rx_Buf[20],UART_Tx_Buf[20];
uint8_t Key_Temp,Enable_S,Task_1_State,While_State,Task_2_State,Task_3_State,Task_3_Key,Task_4_State,Task_5_State;
float Willing_Step_X,Willing_Step_Y;

uint8_t Key1_S,Key3_S,Key4_S,Key5_S,UART_TX_23S,Task_6_State;
uint8_t Chess_Grid,Chess_Grid_Buffer[4],Chess_Grid_Num;

void Motor_SetStep_Advance(float Step)
{ 
	if(Step>300)Step=300;
	Step=Step*100/2.508;
	
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;
	
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_RESET);//前进
	HAL_GPIO_WritePin(GPIOA, GPIO_PIN_2, GPIO_PIN_RESET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }
        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
        Delay_us(Current_Delay);
    }
    HAL_Delay(100);
}

void Motor_SetStep_Back(float Step)
{ 
	if(Step>300)Step=300;
	Step=Step*100/2.508;
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;

    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);//回退
	HAL_GPIO_WritePin(GPIOA, GPIO_PIN_2, GPIO_PIN_SET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }
        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
        Delay_us(Current_Delay);
    }
    HAL_Delay(100);
}

void Motor_SetStep_Left(float Step)
{ 
	if(Step>300)Step=300;
	Step=Step*100/2.508;
	
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;
	


    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_SET);//左
	HAL_GPIO_WritePin(GPIOA, GPIO_PIN_2, GPIO_PIN_RESET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }

        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
        Delay_us(Current_Delay);
    }

    HAL_Delay(10);
//    // 电机非使能
//    HAL_GPIO_WritePin(GPIOF, EN_Pin, GPIO_PIN_SET);
}

void Motor_SetStep_Right(float Step)
{ 
	if(Step>300)Step=300;
	Step=Step*100/2.508;
	
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;
	
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, GPIO_PIN_RESET);//you
	HAL_GPIO_WritePin(GPIOA, GPIO_PIN_2, GPIO_PIN_SET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }

        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_0, GPIO_PIN_SET);
        Delay_us(Current_Delay);
    }

    HAL_Delay(10);
}


void MotorZ_SetStep_Up(float Step)
{ 
	if(Step>72)Step=72;
	Step=Step*100/2.482;
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;
	


    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }

        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_SET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
    }

    HAL_Delay(10);
}

void MotorZ_SetStep_Down(float Step)
{ 
	if(Step>72)Step=72;
	Step=Step*100/2.482;
	
	static uint32_t Initial_Delay=500;
	static uint32_t Target_Delay=100;
	uint32_t Acceleration_Steps=0.2*Step;
    uint32_t i;
    uint32_t Current_Delay;
	static uint32_t Stop_Steps;
	Stop_Steps = Step - Acceleration_Steps;

    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_RESET);
    for (i = 0; i < Step; i++)
    {
        // 计算当前延迟
        if (i < Acceleration_Steps)
        {
            // 在加速阶段内，逐步减少延迟
            Current_Delay = Initial_Delay - ((Initial_Delay - Target_Delay) * i / Acceleration_Steps);
        }
		else if(i > Stop_Steps)
		{
			Current_Delay = Initial_Delay - (Initial_Delay - Target_Delay) * (Step - i) / Acceleration_Steps;
		}
        else
        {
            // 达到目标速度后，保持恒定延迟
            Current_Delay = Target_Delay;
        }

        // 发送脉冲
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_SET);
        Delay_us(Current_Delay);
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_RESET);
        Delay_us(Current_Delay);
    }

    HAL_Delay(10);
//    // 电机非使能
//    HAL_GPIO_WritePin(GPIOF, EN_Pin, GPIO_PIN_SET);
}

void MotorZ_Init(void)//该函数在当前方案中已无作用
{
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_RESET);
	HAL_Delay(50);
	MotorZ_SetStep_Down(36);
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_SET);
	OLED_ShowString(1,1,"DISABLE");
}
void UART_Transmit_4(uint8_t Start,uint8_t Sign,uint8_t Chess_Number,uint8_t End)
{
	UART_Tx_Buf[0]=Start;
	UART_Tx_Buf[1]=Sign;
	UART_Tx_Buf[2]=Chess_Number; 
	UART_Tx_Buf[3]=End;
	HAL_UART_Transmit(&huart1,UART_Tx_Buf,4,50);
}

void XY_Write(P_Chess_XY  P_XY,uint8_t Chess_OR_Board_State)
{
	if(Chess_OR_Board_State==0)//0是棋子
	{
		P_XY->Chess_S=UART_Rx_Buf[1];
		P_XY->Chess_X=UART_Rx_Buf[2];
		P_XY->Chess_Y=UART_Rx_Buf[3];
	}
	else if(Chess_OR_Board_State==1)//1是棋盘
	{
		P_XY->Chess_Board_X=UART_Rx_Buf[2];
		P_XY->Chess_Board_Y=UART_Rx_Buf[3];
	}
}

void Servo_SetAngle(float Angle)
{
	if(Angle>180)Angle=180;
	__HAL_TIM_SET_COMPARE(&htim2,TIM_CHANNEL_1,Angle*2000/180+500);
}

void Move_Set(P_Chess_XY P_XY_T)
{
	//计算棋子世界坐标
	Willing_Step_X=Vision_Zero_X+P_XY_T->Chess_X;
	Willing_Step_Y=Vision_Zero_Y+P_XY_T->Chess_Y;
	//使能电机
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_RESET);
//	OLED_ShowString(1,1,"ENABLE");
	//找棋子
	Motor_SetStep_Advance(Willing_Step_X);
	Motor_SetStep_Right(Willing_Step_Y);
	MotorZ_SetStep_Down(22);
	//吸棋子
	HAL_GPIO_WritePin(GPIOB,GPIO_PIN_7,GPIO_PIN_RESET);		
	HAL_Delay(300);
//	OLED_ShowString(3,1,"OKK");
	MotorZ_SetStep_Up(22);
	Servo_SetAngle(50);
	HAL_Delay(650);
	Servo_SetAngle(0);
	//计算棋盘相对坐标
	Temp_Step_X=P_XY_T->Chess_X-P_XY_T->Chess_Board_X;
	Temp_Step_Y=P_XY_T->Chess_Y-P_XY_T->Chess_Board_Y;
	
	if(Temp_Step_X>=0){Willing_Step_X=Temp_Step_X;Motor_SetStep_Back(Willing_Step_X);}
	else {Willing_Step_X=(-Temp_Step_X);Motor_SetStep_Advance(Willing_Step_X);}
	HAL_Delay(300);
	if(Temp_Step_Y>=0){Willing_Step_Y=Temp_Step_Y;Motor_SetStep_Left(Willing_Step_Y);}
	else {Willing_Step_Y=(-Temp_Step_Y);Motor_SetStep_Right(Willing_Step_Y);}
	HAL_Delay(300);
	MotorZ_SetStep_Down(18);
	HAL_Delay(300);
	
	//放棋子
	HAL_GPIO_WritePin(GPIOB,GPIO_PIN_7,GPIO_PIN_SET);
	HAL_Delay(300);
	//放置完毕
	//回零位
	MotorZ_SetStep_Up(18);
	Motor_SetStep_Back(Vision_Zero_X+P_XY_T->Chess_Board_X);
	Motor_SetStep_Left(Vision_Zero_Y+P_XY_T->Chess_Board_Y);
	
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_SET);
//	OLED_ShowString(1,1,"DISABLE");
	HAL_Delay(300);
}

void Move_Set_Chess(P_Chess_XY P_XY_T)
{
	//计算棋子世界坐标
	Willing_Step_X=Vision_Zero_X+P_XY_T->Chess_X;
	Willing_Step_Y=Vision_Zero_Y+P_XY_T->Chess_Y;
	//使能电机
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_RESET);
//	OLED_ShowString(1,1,"ENABLE");
	//找棋子
	Motor_SetStep_Advance(Willing_Step_X);
	Motor_SetStep_Right(Willing_Step_Y);
	MotorZ_SetStep_Down(18);
	//吸棋子
	HAL_GPIO_WritePin(GPIOB,GPIO_PIN_7,GPIO_PIN_RESET);		
	HAL_Delay(300);
//	OLED_ShowString(3,1,"OKK");
	MotorZ_SetStep_Up(18);
	Servo_SetAngle(50);
	HAL_Delay(650);
	Servo_SetAngle(0);
	//计算棋盘相对坐标
	Temp_Step_X=P_XY_T->Chess_X-P_XY_T->Chess_Board_X;
	Temp_Step_Y=P_XY_T->Chess_Y-P_XY_T->Chess_Board_Y;
	
	if(Temp_Step_X>=0){Willing_Step_X=Temp_Step_X;Motor_SetStep_Back(Willing_Step_X);}
	else {Willing_Step_X=(-Temp_Step_X);Motor_SetStep_Advance(Willing_Step_X);}
	HAL_Delay(300);
	if(Temp_Step_Y>=0){Willing_Step_Y=Temp_Step_Y;Motor_SetStep_Left(Willing_Step_Y);}
	else {Willing_Step_Y=(-Temp_Step_Y);Motor_SetStep_Right(Willing_Step_Y);}
	HAL_Delay(300);
	MotorZ_SetStep_Down(18);
	HAL_Delay(300);
	
	//放棋子
	HAL_GPIO_WritePin(GPIOB,GPIO_PIN_7,GPIO_PIN_SET);
	HAL_Delay(300);
	//放置完毕
	//回零位
	MotorZ_SetStep_Up(18);
	Motor_SetStep_Back(Vision_Zero_X+P_XY_T->Chess_Board_X);
	Motor_SetStep_Left(Vision_Zero_Y+P_XY_T->Chess_Board_Y);
	
	HAL_GPIO_WritePin(GPIOA,GPIO_PIN_5,GPIO_PIN_SET);
//	OLED_ShowString(1,1,"DISABLE");
	HAL_Delay(300);
}

void Key_State(void)
{
	KeyNum=Key_GetNum();
	
    if(KeyNum==1)Key1_S++;
//	else if(KeyNum==2)//Key2_S++;//缺限位
	else if(KeyNum==3){Key3_S++;if(Key3_S>5) Key3_S=0;}
	else if(KeyNum==5)Key5_S++;//缺限位
			
	if(Key3_S==2&&KeyNum==1)
	{
		Chess_Grid++;
		if(Chess_Grid>9){Chess_Grid=1;}
	}
	else if(Key3_S==2&&KeyNum==2)
	{
		Chess_Grid_Buffer[Chess_Grid_Num]=Chess_Grid;
		Chess_Grid_Num++;
	}
	else if(Key3_S==2&&KeyNum==4)
	{
		Task_3_Key++;
	}	
	else if(Key3_S==3&&KeyNum==1)
	{
		Chess_Grid++;
		if(Chess_Grid>9){Chess_Grid=1;}
	}
	else if(Key3_S==3&&KeyNum==2)
	{
		Chess_Grid_Buffer[Chess_Grid_Num]=Chess_Grid;
		Chess_Grid_Num++;
	}
	else if(Key3_S==3&&KeyNum==4)
	{
		Task_3_Key++;
	}
	else if(Key3_S==4&&KeyNum==1)
	{
		Chess_Grid++;
		if(Chess_Grid>9)Chess_Grid=1;
	}
	else if(Key3_S==4&&KeyNum==2)
	{
		Chess_Grid_Buffer[0]=Chess_Grid;
	}
	else if(Key3_S==4&&KeyNum==4)
	{
		Key4_S++;//人下棋标志位
	}
	else if(Key3_S==5&&KeyNum==4)
	{
		Key4_S++;//人下棋标志位
	}
}

void Control_AND_OLED_Show(void)
{
	static uint8_t Current,Previous;
	
	Previous=Current;
	Current=Key3_S;
	if(Previous!=Current)
	{
		OLED_Clear();
		Key1_S=0;
	}
	if(Key3_S==0)
	{
		OLED_ShowString(2,4,"__MUMU__");
		OLED_ShowString(3,1,"Three-Piece-Game");
	}
	else if(Key3_S==1)//第一问
	{
		OLED_ShowString(1,5,"TASK-1");
		if(Key1_S)
		{
			UART_Tx_Buf[0]=0xA1;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Key1_S=0;
			OLED_ShowString(2,1,"A1_OK");
		}
	}
	else if(Key3_S==2)//第二问
	{
		static uint8_t Temp=0;
		
		if(Temp==0)
		{
			OLED_ShowString(1,5,"TASK-2");
			OLED_ShowString(2,1,"Chess_Grid:");
			OLED_ShowNum(2,12,Chess_Grid,1);
			OLED_ShowString(3,1,"Grid_Num:");
			OLED_ShowNum(3,10,Chess_Grid_Num,1);
			
			OLED_ShowNum(4,1,Chess_Grid_Buffer[0],1);
			OLED_ShowNum(4,3,Chess_Grid_Buffer[1],1);
			OLED_ShowNum(4,5,Chess_Grid_Buffer[2],1);
			OLED_ShowNum(4,7,Chess_Grid_Buffer[3],1);
		}
		else 
		{
			OLED_ShowString(1,5,"TASK-2");
			OLED_ShowString(2,1,"Task_2_State:");
			OLED_ShowNum(2,14,Task_2_State,1);
		}
		
		if(Chess_Grid_Num==4)
		{
			Chess_Grid=0;
			Chess_Grid_Num=0;
			UART_Tx_Buf[0]=0xA2;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
//			Key2_S=0;
			Key1_S=0;
			OLED_Clear();
			Temp=1;
		}
	}
	
	else if(Key3_S==3)//第三问
	{
		static uint8_t Temp=0;
		
		if(Temp==0)
		{
			OLED_ShowString(1,5,"TASK-3");
			OLED_ShowString(2,1,"Chess_Grid:");
			OLED_ShowNum(2,12,Chess_Grid,1);
			OLED_ShowString(3,1,"Grid_Num:");
			OLED_ShowNum(3,10,Chess_Grid_Num,1);
			
			OLED_ShowNum(4,1,Chess_Grid_Buffer[0],1);
			OLED_ShowNum(4,3,Chess_Grid_Buffer[1],1);
			OLED_ShowNum(4,5,Chess_Grid_Buffer[2],1);
			OLED_ShowNum(4,7,Chess_Grid_Buffer[3],1);
		}
		else 
		{
			OLED_ShowString(1,5,"TASK-3");
			OLED_ShowString(2,1,"Task_3_State:");
			OLED_ShowNum(2,14,Task_3_State,1);
		}		
		if(Chess_Grid_Num==4)
		{
			Chess_Grid=0;
			Chess_Grid_Num=0;
			UART_Tx_Buf[0]=0xA3;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Key1_S=0;
			OLED_Clear();
			Temp=1;
		}
	}
	
	else if(Key3_S==4)//第四问
	{
		OLED_ShowString(1,5,"TASK-4");
		OLED_ShowString(2,1,"Chess_Grid:");
		OLED_ShowNum(2,12,Chess_Grid,1);
		OLED_ShowString(4,1,"Task_4_S:");
		OLED_ShowNum(4,10,Task_4_State,1);
		
		if(Chess_Grid==Chess_Grid_Buffer[0]&&Chess_Grid_Buffer[0]!=0)
		{
			static uint8_t Temp=0;
			if(Temp==0)
			{
				UART_Tx_Buf[0]=0xA4;
				HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
				OLED_ShowString(3,1,"Grid_Num:OK");
				Temp=~Temp;  
			}
						
		}		
	}
	
	else if(Key3_S==5)//第五问
	{
		OLED_ShowString(1,5,"TASK-5");
		OLED_ShowString(3,1,"Task_5_S:");
		OLED_ShowNum(3,10,Task_5_State,1);
		
		if(Key1_S==1)
		{
			OLED_ShowString(2,1,"Game_Start");   
			UART_Tx_Buf[0]=0xA5;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Key1_S=0;
		}
	}
}

void HAL_UARTEx_RxEventCallback(UART_HandleTypeDef *huart, uint16_t Size)//串口Idle中断回调
{
	if(huart==&huart1)
	{	
        if(Size==1)
		{
			if	   (UART_Rx_Buf[0]==0x1A)Task_1_State=1;//第一问开始标志
			else if(UART_Rx_Buf[0]==0x2A)Task_2_State=1;//第二问开始标志
			else if(UART_Rx_Buf[0]==0x3A)Task_3_State=1;
			else if(UART_Rx_Buf[0]==0x4A)Task_4_State=1;
			else if(UART_Rx_Buf[0]==0x5A)Task_5_State=1;
			else if(UART_Rx_Buf[0]==0x6A)Task_6_State=1;
		}
		else if(Size==5)//每收到一个视觉的数据包，对应的状态更新一步
		{
			if	   (UART_Rx_Buf[0]==0xCC&&UART_Rx_Buf[4]==0x77)Task_2_State++;
			else if(UART_Rx_Buf[0]==0xC7&&UART_Rx_Buf[4]==0x7C)Task_3_State++;
			else if(UART_Rx_Buf[0]==0xDD&&UART_Rx_Buf[4]==0x88)Task_4_State++;
			else if(UART_Rx_Buf[0]==0xEE&&UART_Rx_Buf[4]==0x99)Task_5_State++;
			else if(UART_Rx_Buf[0]==0xAB&&UART_Rx_Buf[4]==0xAA)Task_6_State++;
		}
	}
	HAL_UARTEx_ReceiveToIdle_IT(&huart1,UART_Rx_Buf,20);//保持Idle中断一直开启
}


/******************************************************************************************************************************/


void Set_Init(void)
{
	OLED_Init();
	HAL_UARTEx_ReceiveToIdle_IT(&huart1,UART_Rx_Buf,20);
	HAL_TIM_PWM_Start(&htim2,TIM_CHANNEL_1);
}



void While1_Loop(void)
{
	Chess_XY_Struct Chess_XY_Struct_T,*P_Chess_XY_T;
	P_Chess_XY_T=&Chess_XY_Struct_T;
	
	Chess_XY_Struct Chess_XY_Struct_1,*P_Chess_XY_1;
	P_Chess_XY_1=&Chess_XY_Struct_1;
	Chess_XY_Struct Chess_XY_Struct_2,*P_Chess_XY_2;
	P_Chess_XY_2=&Chess_XY_Struct_2;	
	Chess_XY_Struct Chess_XY_Struct_3,*P_Chess_XY_3;
	P_Chess_XY_3=&Chess_XY_Struct_3;
	Chess_XY_Struct Chess_XY_Struct_4,*P_Chess_XY_4;
	P_Chess_XY_4=&Chess_XY_Struct_4;
	
while(1)
{
	Key_State();
	Control_AND_OLED_Show();
	//按键3长按判断逻辑
	if(Key5_S==1)
	{
		//这里保留一个按键功能，长按按键3 两秒时触发。
		Key5_S=0;
	}


	//第一问
	if(Task_1_State==1)//收到棋子坐标
	{ 		  
		if(UART_Rx_Buf[0]==0xAA&&UART_Rx_Buf[4]==0x55)//0xAA，0x55为第一问棋子坐标数据包的帧头，帧尾
		{
			Chess_XY_Struct_T.Chess_S=UART_Rx_Buf[1];
			Chess_XY_Struct_T.Chess_X=UART_Rx_Buf[2];
			Chess_XY_Struct_T.Chess_Y=UART_Rx_Buf[3];
			OLED_ShowString(2,1,"CHESS_OK");
			UART_Tx_Buf[0]=0xB2;//这里发送B2给视觉，表示已收到棋子坐标并解包完成，视觉收到B2时会发送第一问的棋格坐标
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Task_1_State=2;
		}
	}
    else if(Task_1_State==2)//收到棋盘坐标
	{
		if(UART_Rx_Buf[0]==0xBB&&UART_Rx_Buf[4]==0x66)
		{
			Chess_XY_Struct_T.Chess_Board_X=UART_Rx_Buf[2];
			Chess_XY_Struct_T.Chess_Board_Y=UART_Rx_Buf[3];
			OLED_ShowString(2,1,"BOARD_OK");
			Task_1_State=3;  
		}
		//到这一步状态时，棋子棋盘坐标均已收到
	}		  
	else if(Task_1_State==3)//移动棋子到棋盘并清零标志位
	{
		Move_Set(P_Chess_XY_T);
		Task_1_State=0;
		OLED_ShowString(2,1,"MOVE_OK");
	}
	//第二问
	if(Task_2_State==1)
	{
		if(UART_Tx_Buf[1]!=0xB5)UART_Transmit_4(0xCC,0xB5,0x01,0x77); 
	}	 
	else if(Task_2_State==2)//收到第一个黑棋坐标
	{
		//写入第一个黑棋坐标
		if(UART_Tx_Buf[1]!=0xA9) 
		{
			XY_Write(P_Chess_XY_1,0);
			UART_Transmit_4(0xCC,0xA9,Chess_Grid_Buffer[0],0x77);//发送第一个黑棋子应去的棋盘坐标请求
		}
	}
	else if(Task_2_State==3)//收到第一个黑棋格子坐标
	{
		if(UART_Tx_Buf[1]!=0xB5) 
		{
			XY_Write(P_Chess_XY_1,1);
			UART_Transmit_4(0xCC,0xB5,0x02,0x77);//发第二个黑棋请求
		}
	}
	else if(Task_2_State==4)//收到第二个黑棋坐标
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_2,0);
			UART_Transmit_4(0xCC,0xA9,Chess_Grid_Buffer[1],0x77);
		}
	
	}
	else if(Task_2_State==5)//收到第二个黑棋格子坐标
	{
		if(UART_Tx_Buf[1]!=0xC5)
		{		
			XY_Write(P_Chess_XY_2,1);
			UART_Transmit_4(0xCC,0xC5,0x02,0x77);
		}
	}
	else if(Task_2_State==6)//收①白棋
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_3,0);
			UART_Transmit_4(0xCC,0xA9,Chess_Grid_Buffer[2],0x77);
		}
	}
	else if(Task_2_State==7)
	{
		if(UART_Tx_Buf[1]!=0xC5)
		{
			XY_Write(P_Chess_XY_3,1);
			UART_Transmit_4(0xCC,0xC5,0x03,0x77);
		}
	}
	else if(Task_2_State==8)//收②白棋
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_4,0);
			UART_Transmit_4(0xCC,0xA9,Chess_Grid_Buffer[3],0x77);
		}
	}
	else if(Task_2_State==9)
	{
		XY_Write(P_Chess_XY_4,1);
		
		OLED_ShowString(4,1,"UART_OK");
		Move_Set(P_Chess_XY_1);
		Move_Set(P_Chess_XY_2);
		Move_Set(P_Chess_XY_3);
		Move_Set(P_Chess_XY_4);
		Task_2_State=0;
		OLED_ShowString(4,9,"TASK2_OK");	
	}
	//第三问
	if(Task_3_State==1)
	{
		if(UART_Tx_Buf[1]!=0xB5)UART_Transmit_4(0xC7,0xB5,0x01,0x7C); 
	}	 
	else if(Task_3_State==2)//收到第一个黑棋坐标
	{
		//写入第一个黑棋坐标
		if(UART_Tx_Buf[1]!=0xA9) 
		{
			XY_Write(P_Chess_XY_1,0);
			UART_Transmit_4(0xC7,0xA9,Chess_Grid_Buffer[0],0x7C);//发送第一个黑棋子应去的棋盘坐标请求
		}
	}
	else if(Task_3_State==3)//收到第一个黑棋格子坐标
	{
		if(UART_Tx_Buf[1]!=0xB5) 
		{
			XY_Write(P_Chess_XY_1,1);
			UART_Transmit_4(0xC7,0xB5,0x02,0x7C);//发第二个黑棋请求
		}
	}
	else if(Task_3_State==4)//收到第二个黑棋坐标
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_2,0);
			UART_Transmit_4(0xC7,0xA9,Chess_Grid_Buffer[1],0x7C);
		}
	}
	else if(Task_3_State==5)//收到第二个黑棋格子坐标
	{
		if(UART_Tx_Buf[1]!=0xC5)
		{		
			XY_Write(P_Chess_XY_2,1);
			UART_Transmit_4(0xC7,0xC5,0x02,0x7C);
		}
	}
	else if(Task_3_State==6)//收①白棋
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_3,0);
			UART_Transmit_4(0xC7,0xA9,Chess_Grid_Buffer[2],0x7C);
		}
	}
	else if(Task_3_State==7)
	{
		if(UART_Tx_Buf[1]!=0xC5)
		{
			XY_Write(P_Chess_XY_3,1);
			UART_Transmit_4(0xC7,0xC5,0x03,0x7C);
		}
	}
	else if(Task_3_State==8)//收②白棋
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_4,0);
			UART_Transmit_4(0xC7,0xA9,Chess_Grid_Buffer[3],0x7C);
		}
	}
	else if(Task_3_State==9)
	{
		XY_Write(P_Chess_XY_4,1);
		
		OLED_ShowString(4,1,"UART_OK");
		Move_Set(P_Chess_XY_1);
		Move_Set(P_Chess_XY_2);
		Move_Set(P_Chess_XY_3);
		Move_Set(P_Chess_XY_4);
		Task_3_State=0;
		OLED_ShowString(4,9,"TASK3_OK");	
	}
	
	//第四问
	if(Task_4_State==1)
	{
		if(UART_Tx_Buf[1]!=0xB5)UART_Transmit_4(0xDD,0xB5,0x01,0x88);
	}
	else if(Task_4_State==2)//收到黑棋坐标
	{
		if(UART_Tx_Buf[1]!=0xA9)
		{
			XY_Write(P_Chess_XY_T,0);
			UART_Transmit_4(0xDD,0xA9,Chess_Grid_Buffer[0],0x88);//发送格子请求
		}			
			
	}
	else if(Task_4_State==3)//收到格子坐标
	{
		static uint8_t Temp=0;
		if(Temp==0)
		{
			XY_Write(P_Chess_XY_T,1);
			Move_Set(P_Chess_XY_T);//移动第一颗黑棋
			Temp=1;
		}
		else if(Key4_S==1)//人已经下完棋
		{
			UART_Tx_Buf[0]=0xE1;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Key4_S=0;
		}
	}
	else if(Task_4_State==4)//收到棋子
	{
		XY_Write(P_Chess_XY_T,0);
		if(UART_Tx_Buf[0]!=0xE2)
		{
			UART_Tx_Buf[0]=0xE2;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
		}
	}
	else if(Task_4_State==5)//收到棋盘
	{
		XY_Write(P_Chess_XY_T,1);				
		Move_Set(P_Chess_XY_T);
		
		UART_Tx_Buf[0]=0xE3;
		HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
		
		Task_4_State=3;
	}
	//第五问
	if(Task_5_State==1)
	{
		if(Key4_S==1)//人已经下完棋
		{	
			UART_Tx_Buf[0]=0xE1;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
			Key4_S=0;
		}
	}
	else if(Task_5_State==2)//收到棋子
	{
		XY_Write(P_Chess_XY_T,0);
		if(UART_Tx_Buf[0]!=0xE2)
		{
			UART_Tx_Buf[0]=0xE2;
			HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
		}
	}
	else if(Task_5_State==3)//收到棋盘
	{
		XY_Write(P_Chess_XY_T,1);		
		Move_Set(P_Chess_XY_T);
		UART_Tx_Buf[0]=0xE3;
		HAL_UART_Transmit(&huart1,UART_Tx_Buf,1,50);
		Task_5_State=1;
	}
	
	//第六问
	if(Task_6_State==1)
	{
		HAL_GPIO_WritePin(GPIOC,GPIO_PIN_13,GPIO_PIN_SET);
		//后续完善可以在此处加其他显示标志。
	}  
	else if(Task_6_State==2)
	{
		XY_Write(P_Chess_XY_T,0);
	}
	else if(Task_6_State==3)
	{
		XY_Write(P_Chess_XY_T,1);
		Move_Set_Chess(P_Chess_XY_T);
		HAL_GPIO_WritePin(GPIOC,GPIO_PIN_13,GPIO_PIN_RESET);
		Task_6_State=0;
	}
}//while
}








