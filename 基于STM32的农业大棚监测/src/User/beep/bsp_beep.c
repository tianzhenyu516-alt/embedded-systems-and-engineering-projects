
#include "bsp_beep.h" 


void Beep_Init(void)
{	
    /* 定义io结构体 */
	GPIO_InitTypeDef GPIO_InitStructure;
	/* 端口模式配置 */
	GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP;    
	GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz;

	
	RCC_APB2PeriphClockCmd(BEEP_GPIO_CLK ,ENABLE);	
	
		
	/* 相关端口引脚初始化 */
	GPIO_InitStructure.GPIO_Pin = BEEP_GPIO_PIN;	
	GPIO_Init(BEEP_GPIO_PORT, &GPIO_InitStructure);
	
	/* 默认输出高电平 */
	GPIO_SetBits(BEEP_GPIO_PORT, BEEP_GPIO_PIN);
	BEEP_OFF;//蜂鸣器关
}

void Beep_StateRefresh(uint8_t BeepState)  
{  
#define BEEP_PERIID_TIME       10    // period 1.0s  
#define BEEP_ON_TIME     1     // lighting last time  
#define BEEP_CYCLE_TIME        1     // one times
      
    static int32_t s_LedCycleTime = BEEP_PERIID_TIME;  
    static int32_t s_Cnt = BEEP_ON_TIME * BEEP_CYCLE_TIME * 2;      
  
    if(s_LedCycleTime > 0){  
        s_LedCycleTime --;  
        if(s_Cnt > 0){  
            if(s_Cnt % (BEEP_ON_TIME * 2) == 0){  
                BEEP_ON;
            }else{  
                BEEP_OFF;
            }  
            s_Cnt --;  
        }else{  
            BEEP_OFF;
        }  
    }else{  
        s_LedCycleTime = BEEP_PERIID_TIME;  
        s_Cnt = BEEP_ON_TIME * BeepState * 2;  
        BEEP_OFF;
    }  
}

