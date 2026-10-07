#include "ti_msp_dl_config.h"
#include "system.h"

#include "ntimer.h"



systime timer_t1a,timer_t5a,timer_t6a,timer_t7a;
extern void maple_duty_200hz(void);
extern void duty_1000hz(void);
extern void duty_100hz(void);
extern void duty_10hz(void);


void timer_irq_config(void)
{
  //pwm
  DL_TimerA_startCounter(PWM_0_INST);
  DL_TimerA_startCounter(PWM_1_INST);
//  DL_TimerG_startCounter(PWM_2_INST);
	
  NVIC_EnableIRQ(TIMER_1_INST_INT_IRQN);
  DL_TimerG_startCounter(TIMER_1_INST);
  NVIC_EnableIRQ(TIMER_2_INST_INT_IRQN);
  DL_TimerG_startCounter(TIMER_2_INST);
	
  NVIC_EnableIRQ(TIMER_G8_INST_INT_IRQN);
  DL_TimerG_startCounter(TIMER_G8_INST);
	
  NVIC_EnableIRQ(TIMER_G12_INST_INT_IRQN);
  DL_TimerG_startCounter(TIMER_G12_INST);
}

void timer_pwm_config(void)
{
  //pwm
  DL_TimerA_startCounter(PWM_0_INST);//A0
  DL_TimerA_startCounter(PWM_1_INST);//A1
  //DL_TimerG_startCounter(PWM_2_INST);//G7
}




systime t_g0;
void TIMER_1_INST_IRQHandler(void)
{
  switch (DL_TimerG_getPendingInterrupt(TIMER_1_INST))
  {
    case DL_TIMERG_IIDX_ZERO:
    {
      get_systime(&t_g0);
      maple_duty_200hz();
      static uint32_t _cnt = 0; _cnt++;
      if(_cnt % 50 == 0)	DL_GPIO_togglePins(GPIO_RGB_PORT, GPIO_RGB_GREEN_PIN);
    }
    break;

    default:
      break;
  }
}


systime t_g1;
void TIMER_2_INST_IRQHandler(void)//地面站数据发送中断函数
{
  switch (DL_TimerG_getPendingInterrupt(TIMER_2_INST))
  {
    case DL_TIMERG_IIDX_ZERO:
    {
      get_systime(&t_g1);
   		duty_100hz();
    }
    break;

    default:
      break;
  }
}

systime t_g8;
void TIMER_G8_INST_IRQHandler(void)//地面站数据发送中断函数
{
  switch (DL_TimerG_getPendingInterrupt(TIMER_G8_INST))
  {
    case DL_TIMERG_IIDX_ZERO:
    {
      get_systime(&t_g8);
			duty_10hz();
    }
    break;
    default:
      break;
  }
}


systime t_g12;
void TIMER_G12_INST_IRQHandler(void)//地面站数据发送中断函数
{
  switch (DL_TimerG_getPendingInterrupt(TIMER_G12_INST))
  {
    case DL_TIMERG_IIDX_ZERO:
    {
      get_systime(&t_g12);
			duty_1000hz();
    }
    break;
    default:
      break;
  }
}



void Reserved_PWM5_Output(uint16_t us)
{
  DL_TimerA_setCaptureCompareValue(PWM_1_INST, us, GPIO_PWM_1_C0_IDX);//TIMA1-CH0-PA15
}

void Reserved_PWM6_Output(uint16_t us)
{
  DL_TimerA_setCaptureCompareValue(PWM_1_INST, us, GPIO_PWM_1_C1_IDX);//TIMA1-CH1-PA16
}

void Reserved_PWM7_Output(uint16_t us)
{
//  DL_TimerG_setCaptureCompareValue(PWM_2_INST, us, GPIO_PWM_2_C0_IDX);//TIMG7-CH0-PA17
}

void Reserved_PWM8_Output(uint16_t us)
{
//  DL_TimerG_setCaptureCompareValue(PWM_2_INST, us, GPIO_PWM_2_C1_IDX);//TIMG7-CH0-PA2
}


