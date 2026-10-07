#include "stm32f1xx_hal.h"
#include "Delay.h"

#define SystemCoreClock_Indivicial    72



void Delay_us(uint32_t us)
{
    __IO uint32_t currentTicks = SysTick->VAL;
  /* Number of ticks per millisecond */
  const uint32_t tickPerMs = SysTick->LOAD + 1;
  /* Number of ticks to count */
  const uint32_t nbTicks = ((us - ((us > 0) ? 1 : 0)) * tickPerMs) / 1000;
  /* Number of elapsed ticks */
  uint32_t elapsedTicks = 0;
  __IO uint32_t oldTicks = currentTicks;
  do {
    currentTicks = SysTick->VAL;
    elapsedTicks += (oldTicks < currentTicks) ? tickPerMs + oldTicks - currentTicks :
                    oldTicks - currentTicks;
    oldTicks = currentTicks;
  } while (nbTicks > elapsedTicks);
}


//void Delay_us(uint32_t us)
//{
//    uint32_t i;
//    const uint32_t cycles_per_us = SystemCoreClock_Indivicial;  // 每微秒对应的循环次数（72MHz主频）

//    for (i = 0; i < us; i++)
//    {
//        __asm
//        {
//            MOV R0, cycles_per_us  // 将cycles_per_us加载到寄存器R0
//            LABEL_LOOP: SUBS R0, R0, #1  // R0减1
//            BNE LABEL_LOOP         // 如果R0不为0，跳回LABEL_LOOP
//        }
//    }
//}//该函数实现的功能和上边函数的功能相同，用汇编编写

