#include "ti_msp_dl_config.h"
#include "datatype.h"
#include "ngpio.h"
#include "nadc.h"
#include "user.h"

uint16_t adc_value;

low_voltage vbat={
	.enable=no_voltage_enable_default,
	.value=0,
	.upper=no_voltage_upper_default,
	.lower=no_voltage_lower_default
};


void nADC_Init(void)
{
	NVIC_EnableIRQ(ADC12_0_INST_INT_IRQN);
}


/***************************************
函数名:	void get_battery_voltage(void)
说明: ADC采样触发
入口:	无
出口:	无
备注:	测量电池电压，飞控默认分压比为11，故测量电压不要超过
3.3V*11=36.6V，若想测更大的电压，调整板子上分压电阻阻值即可
作者:	无名创新
***************************************/
float get_battery_voltage(void)//ADC获取   
{
	static float value_filter;
	value_filter=0.9f*value_filter+0.1f*adc_value*36.3f/4095.0f;	
	vbat.value=value_filter;
  return vbat.value;	
}

/***************************************
函数名:	void battery_voltage_detection(void)
说明: 电池电压监测
入口:	无
出口:	无
备注:	需要设定电压阈值
作者:	无名创新
***************************************/
void battery_voltage_detection(void)
{
	static uint16_t _cnt=0;
	_cnt++;
	if(_cnt>=200)//每1S检测一次
	{
		_cnt=0;
		if(vbat.value<vbat.upper&&vbat.value>vbat.lower)	 vbat.low_vbat_cnt++;
		else vbat.low_vbat_cnt/=2;
		if(vbat.low_vbat_cnt>=10)//持续10s满足
		{
			if(vbat.enable==1)
			{
				beep.period=200;//200*5ms
				beep.light_on_percent=0.25f;
				beep.reset=1;	
				beep.times=5;//闪烁5次
			}
			vbat.low_vbat_cnt=0;//清0待下一周期检测			
		}			
	}
}

volatile bool gCheckADC=false;
void adc_statemachine(void)
{
	DL_ADC12_startConversion(ADC12_0_INST);	//开始转换
	/* Wait until all data channels have been loaded. */
	while (gCheckADC == false);
	adc_value = DL_ADC12_getMemResult(ADC12_0_INST, ADC12_0_ADCMEM_1);//通过PA25读取AD值
	DL_ADC12_enableConversions(ADC12_0_INST);
}

void ADC12_0_INST_IRQHandler(void)
{
    switch (DL_ADC12_getPendingInterrupt(ADC12_0_INST)) {
        case DL_ADC12_IIDX_MEM1_RESULT_LOADED:
            gCheckADC = true;
            break;
        default:
            break;
    }
}
