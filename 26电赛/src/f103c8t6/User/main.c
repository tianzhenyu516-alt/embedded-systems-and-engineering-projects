#include "stm32f10x.h"
#include "Delay.h"
#include "OLED.h"
#include "Key.h"
#include "Motor.h"
#include "Track.h"
#include "Timer.h"

/* ================= 调参区 ================= */
#define SPD_FAST        999   /* 直线狂暴模式：满速 */
#define SPD_REV         999   /* 打死反转力度：最外侧见线时内轮全速反转枢轴 */
#define STOP_MIN_BLACK  3     /* 同时检黑传感器数>=此值判定停车线 */
#define STOP_FRAMES     3     /* 停车确认帧数 */
#define STOP_ARM_MS     15000 /* 起跑15秒内不检停车线，之后才开始 */
#define LOST_TIMEOUT    2000  /* 全白丢线超时（ms），超时停车 */
/* ========================================== */

#define STATE_STOP      0
#define STATE_RUN       1

extern volatile uint8_t timer_1khz_flag;
extern volatile uint32_t g_tick_ms;

uint8_t  Track;
uint8_t  car_state;
uint32_t oled_tick;
uint8_t  stop_confirm;
uint32_t run_start;		/* RUN起始时刻(tick) */
uint32_t run_elapsed;	/* 计时冻结值：只在RUN期间更新，停车后保持 */
uint32_t last_line;		/* 最后一次见线时刻(tick) */

int main(void)
{
	int16_t L, R;
	uint8_t i, black_cnt;
	uint32_t now;

	NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2);
	Motor_Init();	/* 最先初始化：复位后第一时间把驱动脚拉低，防电机窜动 */
	Delay_Init();
	OLED_Init();
	Key_Init();
	Track_Init();
	Timer_Init();	/* TIM4 1kHz中断：计时基准（电机PWM由TIM1硬件输出） */

	car_state = STATE_STOP;
	stop_confirm = 0;
	run_start = 0;
	run_elapsed = 0;
	last_line = 0;

	OLED_ShowString(1,1,"V41");
	Delay_ms(2000);
	Key_Calibrate();	/* 采样按键静止电平，防开机误触发 */
	OLED_Clear();

	OLED_ShowString(1,1,"BIN:");
	OLED_ShowString(1,15,"41");
	OLED_ShowString(2,1,"RAW:");
	OLED_ShowString(2,8,"C:");
	OLED_ShowString(3,1,"T:");
	OLED_ShowString(3,5,".");
	OLED_ShowString(3,7,"s");
	OLED_ShowString(4,1,"K:");
	OLED_ShowString(4,5,"S:STOP");

	while(1)
	{
		now = g_tick_ms;
		if(car_state == STATE_RUN) run_elapsed = now - run_start;	/* RUN期间才走表，停车冻结 */

		/* 按键：STOP→RUN 起跑 / RUN→STOP 停车，两态切换 */
		if(Key_GetNum() == 1)
		{
			if(car_state == STATE_STOP)
			{
				car_state = STATE_RUN;
				stop_confirm = 0;
				run_start = g_tick_ms;
				last_line = g_tick_ms;
				OLED_ShowString(4,7,"RUN ");
			}
			else
			{
				car_state = STATE_STOP;
				Motor_Set(0,0);
				OLED_ShowString(4,7,"STOP");
			}
		}

		Read_Track_DATA(&Track);

		/* 统计检黑传感器个数 */
		black_cnt = 0;
		for(i = 0; i < 8; i++)
		{
			if(Track & (1U << i)) black_cnt++;
		}

		if(car_state != STATE_RUN)
		{
			Motor_Set(0,0);
			goto DISPLAY;
		}

		/* ===== 停车：起跑STOP_ARM_MS后才检，>=STOP_MIN_BLACK路检黑，连续STOP_FRAMES帧 ===== */
		if(run_elapsed >= STOP_ARM_MS && black_cnt >= STOP_MIN_BLACK)
		{
			stop_confirm++;
			if(stop_confirm >= STOP_FRAMES)
			{
				Motor_Set(0,0);
				car_state = STATE_STOP;
				stop_confirm = 0;
				OLED_ShowString(4,7,"STOP");
				goto DISPLAY;
			}
		}
		else
		{
			stop_confirm = 0;

			/* ===== 循迹（狂暴直行 + 打死枢轴转弯）=====
			 * bit0=传感器1(最内侧) ... bit7=传感器8(最外侧)
			 * 最外侧(bit7)见线：左轮全速反转打死、右轮满速 → 原地左枢
			 * 次外侧(bit6)见线：左轮停、右轮满速 → 左修正
			 * 中心(bit5~bit2，传感器3-6)：双轮满速直行
			 * 次内侧(bit1)见线：右轮停、左轮满速 → 右修正
			 * 最内侧(bit0)见线：右轮全速反转打死、左轮满速 → 原地右枢
			 * 全白丢线：保持满速直行，超时停车 */
			if(Track & 0x80)      { L = -SPD_REV; R = SPD_FAST; last_line = now; }
			else if(Track & 0x40) { L = 0;        R = SPD_FAST; last_line = now; }
			else if(Track & 0x20) { L = SPD_FAST; R = SPD_FAST; last_line = now; }
			else if(Track & 0x10) { L = SPD_FAST; R = SPD_FAST; last_line = now; }
			else if(Track & 0x08) { L = SPD_FAST; R = SPD_FAST; last_line = now; }
			else if(Track & 0x04) { L = SPD_FAST; R = SPD_FAST; last_line = now; }
			else if(Track & 0x02) { L = SPD_FAST; R = 0;        last_line = now; }
			else if(Track & 0x01) { L = SPD_FAST; R = -SPD_REV; last_line = now; }
			else                  { L = SPD_FAST; R = SPD_FAST; }

			if(now - last_line >= LOST_TIMEOUT)
			{
				Motor_Set(0,0);
				car_state = STATE_STOP;
				OLED_ShowString(4,7,"STOP");
				goto DISPLAY;
			}

			Motor_Set(L, R);
		}

DISPLAY:
		oled_tick++;
		if(oled_tick >= 100)
		{
			oled_tick = 0;
			OLED_ShowBinNum(1,5,Track,8);
			OLED_ShowHexNum(2,5,(uint8_t)(GPIOA->IDR & 0xFF),2);
			OLED_ShowNum(2,10,black_cnt,1);
			OLED_ShowNum(3,3,run_elapsed/1000,2);
			OLED_ShowNum(3,6,(run_elapsed%1000)/100,1);
			OLED_ShowNum(4,3,GPIO_ReadInputDataBit(GPIOB,GPIO_Pin_6),1);
		}
		Delay_ms(1);
	}
}

void USART_PID_Adjust(uint8_t Motor_n,char* recv_buf)
{
	(void)Motor_n;
	(void)recv_buf;
}
