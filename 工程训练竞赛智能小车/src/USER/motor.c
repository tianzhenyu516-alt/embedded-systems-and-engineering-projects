#include "stm32f4xx.h"                  // Device header
#include "delay.h"
#include "duoji.h"
#include "Motor.h"  
#include "Motor_Init.h"  
#include <math.h>
//此部分代码参考的B站轻风雨大佬的加减速代码
//这里是我们的算法精髓啦，这里使用了T形加减速算法

/********************************电机轮子*****************************************************************************/

speedRampData srd= {STOP,0,0,0,0,0,0}; //加减速变量    

uint8_t  motor_sta        = 0;//电机状态


/**
 * @brief 电机轮子加减速分配
 * 
 * 电机轮子加减速分配
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void MOTOR_Move(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
		
    uint16_t tim_count; 																										 //存放中断时刻的计数值
    unsigned int max_s_lim;                                     					 	 //达到最大速度时的步数    
    unsigned int accel_lim;																									 //必须开始减速的步数（如果还没有加速度到最大速度时）

    if(motor_sta!= STOP)  																									 //只允许步进电机在停止的时候才继续
			return;			
    if(step < 0)   																													 //逆时针
		{
			step = -step;      
		}		     
    if(step == 1)   																											   //如果只移动一步
    {       
      srd.accel_count = -1; 																								 //只移动一步
      srd.run_state = DECEL;																								 //减速状态
      srd.step_delay = 1000;																								 //短延时
     }
    else if(step != 0)  																			 							 //步数不为零才移动
    {					
				srd.min_delay = (int32_t)(A_T_x10/speed);														 //设置最大速度极限, 计算min_delay用于定时器的计数器的值min_delay = (alpha / tt)/ w   
				srd.step_delay = (int32_t)((T1_FREQ_148 * sqrt(A_SQ / accel))/10);	 //通过计算第一个(c0) 的步进延时来设定加速度,其中accel单位为0.01rad/sec^2
																																						 //tep_delay = 1/tt * sqrt(2*alpha/accel)
																																						 //step_delay = ( tfreq*0.69/10 )*10 * sqrt( (2*alpha*100000) / (accel*10) )/100 
			  max_s_lim = (uint32_t)(speed*speed/(A_x200*accel/10));							 //计算多少步之后达到最大速度的限制 max_s_lim = speed^2 / (2*alpha*accel)
    
				if(max_s_lim == 0)																									 //如果达到最大速度小于0.5步，我们将四舍五入为0,但实际我们必须移动至少一步才能达到想要的速度 
				{
					max_s_lim = 1;
				}    
				accel_lim = (uint32_t)(step*decel/(accel+decel)); 									 //计算多少步之后我们必须开始减速,n1 = (n1+n2)decel / (accel + decel)
   
				if(accel_lim == 0) 																									 //我们必须加速至少1步才能开始减速
				{
					accel_lim = 1;
				}
   
				if(accel_lim <= max_s_lim)																					 //加速阶段到不了最大速度就得减速。。。使用限制条件我们可以计算出减速阶段步数 
				{
					srd.decel_val = accel_lim - step;																	 //减速段的步数
				}
				else
				{
					srd.decel_val = -(max_s_lim*accel/decel);													 //减速段的步数 
				}
				
				if(srd.decel_val == 0) 																							 //不足一步 按一步处理 
				{
					srd.decel_val = -1;
				}    
				srd.decel_start = step + srd.decel_val;															 //计算开始减速时的步数
				
				if(srd.step_delay <= srd.min_delay)																	 //如果一开始c0的速度比匀速段速度还大，就不需要进行加速运动，直接进入匀速
				{
					srd.step_delay = srd.min_delay;
					srd.run_state = RUN;
				}
				else
				{
					srd.run_state = ACCEL;
				}
    
				srd.accel_count = 0;																									//复位加速度计数值
		
			}
			motor_sta = 1;  																												//电机为运动状态
			tim_count = TIM_GetCounter(TIM3);																				//获取计数值
			TIM_SetCompare1(TIM3,tim_count+srd.step_delay/2);												//设置定时器比较值 
			TIM_ITConfig(TIM3,TIM_IT_CC1,ENABLE);																		//使能定时器通道 
			TIM_CCxCmd(TIM3,TIM_Channel_1,TIM_CCx_Enable);
			
			TIM_SetCompare2(TIM3,tim_count+srd.step_delay/2);												//设置定时器比较值 
			TIM_ITConfig(TIM3,TIM_IT_CC2,ENABLE);																		//使能定时器通道 
			TIM_CCxCmd(TIM3,TIM_Channel_2,TIM_CCx_Enable);
			
			TIM_SetCompare3(TIM3,tim_count+srd.step_delay/2);												//设置定时器比较值 
			TIM_ITConfig(TIM3,TIM_IT_CC3,ENABLE);																		//使能定时器通道 
			TIM_CCxCmd(TIM3,TIM_Channel_3,TIM_CCx_Enable);
			
			TIM_SetCompare4(TIM3,tim_count+srd.step_delay/2);												//设置定时器比较值 
			TIM_ITConfig(TIM3,TIM_IT_CC4,ENABLE);																		//使能定时器通道 
			TIM_CCxCmd(TIM3,TIM_Channel_4,TIM_CCx_Enable);
			
			TIM_Cmd(TIM3, ENABLE);																									//开启定时器
}

/**
 * @brief T形加减速中断决策
 * 
 * T形加减速中断决策，放在中断执行函数
 * 
 */
void speed_decision(void)                                                   // 中断执行函数
{
		__IO uint32_t tim_count=0;
		__IO uint32_t tmp = 0;  
	  uint16_t new_step_delay=0;                                              // 保存新（下）一个延时周期  
	  __IO static uint16_t last_accel_delay=0;                                // 加速过程中最后一次延时（脉冲周期）. 
	  __IO static uint32_t step_count = 0; 																	  // 总移动步数计数器  
	  __IO static int32_t rest = 0;																						// 记录new_step_delay中的余数，提高下一步计算的精度  
	  __IO static uint8_t i=0;																								// 定时器使用翻转模式，需要进入两次中断才输出一个完整脉冲
	 
	  if ((TIM_GetITStatus(TIM3, TIM_IT_CC1)== SET) ||(TIM_GetITStatus(TIM3, TIM_IT_CC2)== SET)
          ||TIM_GetITStatus(TIM3, TIM_IT_CC3)== SET||(TIM_GetITStatus(TIM3, TIM_IT_CC4)== SET))
	  {	  
			TIM_ClearITPendingBit(TIM3, TIM_IT_CC1);															// 清楚定时器中断		
			TIM_ClearITPendingBit(TIM3, TIM_IT_CC2);
			TIM_ClearITPendingBit(TIM3, TIM_IT_CC3);
			TIM_ClearITPendingBit(TIM3, TIM_IT_CC4);
		  tim_count = TIM_GetCounter(TIM3);	
			tmp = tim_count+srd.step_delay/2;
		  TIM_SetCompare1(TIM3,tmp);																						// 设置比较值
			TIM_SetCompare2(TIM3,tmp);
			TIM_SetCompare3(TIM3,tmp);
			TIM_SetCompare4(TIM3,tmp);
			i++; 
			if(i==2)																															// 中断两次为一个脉冲
			{
				i=0; 
				switch(srd.run_state)
				{
					case STOP:																												// 停止状态
						step_count = 0;
						rest = 0;
						TIM_ClearITPendingBit(TIM3, TIM_IT_CC1);
					  TIM_CCxCmd(TIM3,TIM_Channel_1,TIM_CCx_Disable);
						TIM_ClearITPendingBit(TIM3, TIM_IT_CC2);
					  TIM_CCxCmd(TIM3,TIM_Channel_2,TIM_CCx_Disable);
						TIM_ClearITPendingBit(TIM3, TIM_IT_CC3);
					  TIM_CCxCmd(TIM3,TIM_Channel_3,TIM_CCx_Disable);
						TIM_ClearITPendingBit(TIM3, TIM_IT_CC4);
					  TIM_CCxCmd(TIM3,TIM_Channel_4,TIM_CCx_Disable);
					  TIM_Cmd(TIM3, DISABLE);					                                // 单个电机可以关闭定时器，多个电机只关闭通道即可
						motor_sta = 0;  
						break;
					
					case ACCEL:																												// 加速状态
					step_count++;
					srd.accel_count++;
					new_step_delay = srd.step_delay - (((2 *srd.step_delay) + rest)/(4 * srd.accel_count + 1));// 计算新(下)一步脉冲周期(时间间隔)
					rest = ((2 * srd.step_delay)+rest)%(4 * srd.accel_count + 1);	   	// 计算余数，下次计算补上余数，减少误差
					
					if(step_count >= srd.decel_start) 																// 检查是够应该开始减速
					{
						srd.accel_count = srd.decel_val;																// 加速计数值为减速阶段计数值的初始值
						srd.run_state = DECEL;																					// 下个脉冲进入减速阶段 
					}
					
					else if(new_step_delay <= srd.min_delay)													// 检查是否到达期望的最大速度
					{
						last_accel_delay = new_step_delay;															// 保存加速过程中最后一次延时（脉冲周期）
						new_step_delay = srd.min_delay;   															// 使用min_delay（对应最大速度speed） 
						rest = 0;            																						// 清零余值               
						srd.run_state = RUN;																						// 设置为匀速运行状态 
					}
					break;
					
					case RUN:
			  step_count++;  																											// 步数加1				  
			  new_step_delay = srd.min_delay;   																  // 使用min_delay（对应最大速度speed）				 
			  if(step_count >= srd.decel_start)   																// 需要开始减速
						{
				srd.accel_count = srd.decel_val;  																	// 减速步数做为加速计数值
				new_step_delay = last_accel_delay;																	// 加阶段最后的延时做为减速阶段的起始延时(脉冲周期)
				srd.run_state = DECEL;           																 	 //  状态改变为减速
			  }
			  break;
						
					case DECEL:
			  step_count++;  																											// 步数加1

			  srd.accel_count++; 																									// 是个负数
			  new_step_delay = srd.step_delay - (((2 * srd.step_delay) + rest)/(4 * srd.accel_count + 1)); //计算新(下)一步脉冲周期(时间间隔)
			  rest = ((2 * srd.step_delay)+rest)%(4 * srd.accel_count + 1);				// 计算余数，下次计算补上余数，减少误差
			  if(srd.accel_count >= 0) 																						// 检查是否为最后一步  是个负数所以要判断 大于等于零时 应该就是减速结束
			  {
					srd.run_state = STOP;
			  }
			  break;
				}
			srd.step_delay = new_step_delay; 																			// 为下个(新的)延时(脉冲周期)赋值
			}
		}
}

	

/********************************丝杆升降*****************************************************************************/

uint8_t  sigan_sta        = 0;//电机状态

/**
 * @brief 丝杆电机加减速分配
 * 
 * 电机轮子加减速分配
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void SiGan_Move(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
		
    uint16_t tim_count; 																										 //存放中断时刻的计数值
    unsigned int max_s_lim;                                     					 	 //达到最大速度时的步数    
    unsigned int accel_lim;																									 //必须开始减速的步数（如果还没有加速度到最大速度时）
//sigan_sta = 0;  		
		if(sigan_sta!= STOP)  																									 //只允许步进电机在停止的时候才继续
			return;			
    if(step < 0)   																													 //逆时针
			{
				step = -step;      
			}		   
    if(step == 1)   																											   //如果只移动一步
    {       
      srd.accel_count = -1; 																								 //只移动一步
        
      srd.run_state = DECEL;																								 //减速状态
        
      srd.step_delay = 1000;																								 //短延时

     }
    
    else if(step != 0)  																			 								//步数不为零才移动
    {					
				srd.min_delay = (int32_t)(A_T_x10/speed);															//设置最大速度极限, 计算min_delay用于定时器的计数器的值min_delay = (alpha / tt)/ w   
				srd.step_delay = (int32_t)((T1_FREQ_148 * sqrt(A_SQ / accel))/10);		//通过计算第一个(c0) 的步进延时来设定加速度,其中accel单位为0.01rad/sec^2
																																							//step_delay = 1/tt * sqrt(2*alpha/accel)
																																							//step_delay = ( tfreq*0.69/10 )*10 * sqrt( (2*alpha*100000) / (accel*10) )/100 
			  max_s_lim = (uint32_t)(speed*speed/(A_x200*accel/10));								//计算多少步之后达到最大速度的限制 max_s_lim = speed^2 / (2*alpha*accel)
    
				if(max_s_lim == 0)																										//如果达到最大速度小于0.5步，我们将四舍五入为0,但实际我们必须移动至少一步才能达到想要的速度 
				{
					max_s_lim = 1;
				}    
				accel_lim = (uint32_t)(step*decel/(accel+decel)); 										//计算多少步之后我们必须开始减速,n1 = (n1+n2)decel / (accel + decel)
   
				if(accel_lim == 0) 																										//我们必须加速至少1步才能开始减速
				{
					accel_lim = 1;
				}
   
				if(accel_lim <= max_s_lim)																						//加速阶段到不了最大速度就得减速。。。使用限制条件我们可以计算出减速阶段步数 
				{
					srd.decel_val = accel_lim - step;																		//减速段的步数
				}
				else
				{
					srd.decel_val = -(max_s_lim*accel/decel);														//减速段的步数 
				}
   
				if(srd.decel_val == 0) 																								//不足一步 按一步处理 
				{
					srd.decel_val = -1;
				}    
				srd.decel_start = step + srd.decel_val;																//计算开始减速时的步数
 
    
				if(srd.step_delay <= srd.min_delay)																		//如果一开始c0的速度比匀速段速度还大，就不需要进行加速运动，直接进入匀速
				{
					srd.step_delay = srd.min_delay;
					srd.run_state = RUN;
				}
				else
				{
					srd.run_state = ACCEL;
				}
    
				srd.accel_count = 0;																									//复位加速度计数值
		
			}
			sigan_sta = 1;  																												//电机为运动状态
			tim_count = TIM_GetCounter(TIM2);																				//获取计数值
			TIM_SetCompare2(TIM2,tim_count+srd.step_delay/2);												//设置定时器比较值 
			TIM_ITConfig(TIM2,TIM_IT_CC2,ENABLE);																		//使能定时器通道 
			TIM_CCxCmd(TIM2,TIM_Channel_2,TIM_CCx_Enable);
			TIM_Cmd(TIM2, ENABLE);																									//开启定时器
}
 

/**
 * @brief T形加减速中断决策
 * 
 * T形加减速中断决策，放在中断执行函数
 * 
 */
void speed2_decision()                                                         //中断执行函数
{
	__IO uint32_t tim_count=0;
	__IO uint32_t tmp = 0;  
  uint16_t new_step_delay=0;                                                  //保存新（下）一个延时周期  
  __IO static uint16_t last_accel_delay=0;                                    //加速过程中最后一次延时（脉冲周期）. 
  __IO static uint32_t step_count = 0; 																			  //总移动步数计数器  
  __IO static int32_t rest = 0;																								//记录new_step_delay中的余数，提高下一步计算的精度  
  __IO static uint8_t i=0;																										//定时器使用翻转模式，需要进入两次中断才输出一个完整脉冲
 
  if (TIM_GetITStatus(TIM2, TIM_IT_CC2)== SET)
  {	  
		
    TIM_ClearITPendingBit(TIM2, TIM_IT_CC2);																	//清楚定时器中断		
	  tim_count = TIM_GetCounter(TIM2);																					//获取计数值
		tmp = tim_count+srd.step_delay/2;
	  TIM_SetCompare2(TIM2,tmp);																								//设置比较值
		i++; 
		if(i==2)																																	//中断两次为一个脉冲
		{
			i=0; 
			switch(srd.run_state)
			{
				case STOP:																														//停止状态
					step_count = 0;
					rest = 0;
					
					TIM_ClearITPendingBit(TIM2, TIM_IT_CC2);
				  TIM_CCxCmd(TIM2,TIM_Channel_2,TIM_CCx_Disable);
				  TIM_Cmd(TIM2, DISABLE);					                                    //单个电机可以关闭定时器，多个电机只关闭通道即可
					sigan_sta = 0;  
					break;
				
				case ACCEL:																														//加速状态
				step_count++;
				srd.accel_count++;
				new_step_delay = srd.step_delay - (((2 *srd.step_delay) + rest)/(4 * srd.accel_count + 1));//计算新(下)一步脉冲周期(时间间隔)
				rest = ((2 * srd.step_delay)+rest)%(4 * srd.accel_count + 1);					// 计算余数，下次计算补上余数，减少误差
				
					if(step_count >= srd.decel_start) 																	//检查是够应该开始减速
					{
						srd.accel_count = srd.decel_val;																	//加速计数值为减速阶段计数值的初始值
						srd.run_state = DECEL;																						//下个脉冲进入减速阶段 
					}
					
					else if(new_step_delay <= srd.min_delay)														//检查是否到达期望的最大速度
					{
						last_accel_delay = new_step_delay;																//保存加速过程中最后一次延时（脉冲周期）
						new_step_delay = srd.min_delay;   																//使用min_delay（对应最大速度speed） 
						rest = 0;            																							//清零余值               
						srd.run_state = RUN;																							//设置为匀速运行状态 
					}
					break;
					
				case RUN:
          step_count++;  																											//步数加1				  
          new_step_delay = srd.min_delay;   																  //使用min_delay（对应最大速度speed）				 
          if(step_count >= srd.decel_start)   																//需要开始减速
					{
            srd.accel_count = srd.decel_val;  																//减速步数做为加速计数值
            new_step_delay = last_accel_delay;																//加阶段最后的延时做为减速阶段的起始延时(脉冲周期)
            srd.run_state = DECEL;           																  //状态改变为减速
          }
          break;
					
				case DECEL:
          step_count++;  																											//步数加1

          srd.accel_count++; 																									//是个负数
          new_step_delay = srd.step_delay - (((2 * srd.step_delay) + rest)/(4 * srd.accel_count + 1)); //计算新(下)一步脉冲周期(时间间隔)
          rest = ((2 * srd.step_delay)+rest)%(4 * srd.accel_count + 1);				//计算余数，下次计算补上余数，减少误差
          if(srd.accel_count >= 0) 																						//检查是否为最后一步  是个负数所以要判断 大于等于零时 应该就是减速结束
          {
            srd.run_state = STOP;
          }
          break;
			}
			 srd.step_delay = new_step_delay; 																			//为下个(新的)延时(脉冲周期)赋值
		}
	}
}

//定时器2中断 电机丝杆
void TIM2_IRQHandler(void)
{
	
		speed2_decision();
		
}

//定时器3中断 电机轮子
void TIM3_IRQHandler(void)
{
	
		speed_decision();
		
}


/**
 * @brief 车子后退
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void back(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
	GPIO_ResetBits(GPIOD, GPIO_Pin_12);
	GPIO_ResetBits(GPIOD, GPIO_Pin_13);
	GPIO_ResetBits(GPIOC, GPIO_Pin_10);
	GPIO_ResetBits(GPIOC, GPIO_Pin_12);
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 车子前进
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void go(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
	GPIO_SetBits(GPIOD, GPIO_Pin_12 );
	GPIO_SetBits(GPIOD, GPIO_Pin_13);
	GPIO_SetBits(GPIOC, GPIO_Pin_10 );
	GPIO_SetBits(GPIOC, GPIO_Pin_12 );
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 车子右横移
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void right(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
	GPIO_SetBits(GPIOD, GPIO_Pin_12 );
	GPIO_ResetBits(GPIOD, GPIO_Pin_13);
	GPIO_ResetBits(GPIOC, GPIO_Pin_10 );
	GPIO_SetBits(GPIOC, GPIO_Pin_12 );
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 车子左横移
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void left(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
	GPIO_ResetBits(GPIOD, GPIO_Pin_12 );
	GPIO_SetBits(GPIOD, GPIO_Pin_13);
	GPIO_SetBits(GPIOC, GPIO_Pin_10 );
	GPIO_ResetBits(GPIOC, GPIO_Pin_12 );
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 车子左转弯
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void turn_left(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{	
	GPIO_SetBits(GPIOD, GPIO_Pin_12 );
	GPIO_SetBits(GPIOD, GPIO_Pin_13);
	GPIO_ResetBits(GPIOC, GPIO_Pin_10 );
	GPIO_ResetBits(GPIOC, GPIO_Pin_12 );
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 车子右转弯
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void turn_right(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{
	GPIO_ResetBits(GPIOD, GPIO_Pin_12 );
	GPIO_ResetBits(GPIOD, GPIO_Pin_13);
	GPIO_SetBits(GPIOC, GPIO_Pin_10 );
	GPIO_SetBits(GPIOC, GPIO_Pin_12 );
	MOTOR_Move(step, accel, decel, speed);
}

/**
 * @brief 升降丝杆上升
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void down(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{	
  GPIO_SetBits(GPIOC,GPIO_Pin_2);
	SiGan_Move(step, accel, decel, speed);
}

/**
 * @brief 升降丝杆下降
 * 
 * @param step   移动步数（正数为正转，负数为逆时针）
 * @param accel  加速度,实际值为accel*0.1*rad/sec^2  10倍并且2个脉冲算一个完整的周期
 * @param decel  减速度,实际值为decel*0.1*rad/sec^2
 * @param speed  最大速度,实际值为speed*0.1*rad/sec
 * @return null
 */
void rise(int32_t step, uint32_t accel, uint32_t decel, uint32_t speed)
{	
  GPIO_ResetBits(GPIOC,GPIO_Pin_2);
	SiGan_Move(step, accel, decel, speed);
}

