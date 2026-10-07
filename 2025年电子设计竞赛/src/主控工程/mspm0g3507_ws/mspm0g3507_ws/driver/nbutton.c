#include "ti_msp_dl_config.h"
#include "system.h"
#include "ngpio.h"
#include "nbutton.h"


#define keydown_port  KEYB_PORT
#define keydown_pin   KEYB_S3_PIN

#define keyup_port    KEYA_PORT
#define keyup_pin     KEYA_S2_PIN


rc_buttton _button;

/***************************************
函数名:	void Button_Init(void)
说明: 板载按键初始化
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Button_Init(void)
{
  _button.state[UP].port = keyup_port;
  _button.state[UP].pin = keyup_pin;
  _button.state[UP].value = 1;
  _button.state[UP].last_value = 1;

  _button.state[DOWN].port = keydown_port;
  _button.state[DOWN].pin = keydown_pin;
  _button.state[DOWN].value = 1;
  _button.state[DOWN].last_value = 1;

  //3D
//  _button.state[UP_3D].port = PORTB_PORT;
//  _button.state[UP_3D].pin = PORTB_D3_5_PIN;
//  _button.state[UP_3D].value = 1;
//  _button.state[UP_3D].last_value = 1;

//  _button.state[DN_3D].port = PORTB_PORT;
//  _button.state[DN_3D].pin = PORTB_D3_1_PIN;
//  _button.state[DN_3D].value = 1;
//  _button.state[DN_3D].last_value = 1;

//  _button.state[LT_3D].port = PORTB_PORT;
//  _button.state[LT_3D].pin = PORTB_D3_2_PIN;
//  _button.state[LT_3D].value = 1;
//  _button.state[LT_3D].last_value = 1;

//  _button.state[RT_3D].port = PORTB_PORT;
//  _button.state[RT_3D].pin = PORTB_D3_3_PIN;
//  _button.state[RT_3D].value = 1;
//  _button.state[RT_3D].last_value = 1;

//  _button.state[ME_3D].port = PORTB_PORT;
//  _button.state[ME_3D].pin = PORTB_D3_4_PIN;
//  _button.state[ME_3D].value = 1;
//  _button.state[ME_3D].last_value = 1;
	
	_button.state[K3].port = PORTB_PORT;
  _button.state[K3].pin = PORTB_GRAY_BIT6_PIN;
  _button.state[K3].value = 1;
  _button.state[K3].last_value = 1;
	
	_button.state[K2].port = PORTB_PORT;
  _button.state[K2].pin = PORTB_GRAY_BIT7_PIN;
  _button.state[K2].value = 1;
  _button.state[K2].last_value = 1;
}

/***************************************
函数名:	void Read_Button_State_One(button_state *button)
说明: 按键读取状态机
入口:	button_state *button-监测按键结构体指针
出口:	无
备注:	无
作者:	无名创新
***************************************/
void Read_Button_State_One(button_state *button)
{
  if(button->pin == KEYA_S2_PIN)  button->value = (DL_GPIO_readPins(button->port, button->pin) != 0 ? 0x00 : 0x01);
  else button->value = (DL_GPIO_readPins(button->port, button->pin) != 0 ? 0x01 : 0x00);

	if(button->value==0)
	{
		if(button->last_value!=0)//首次按下
		{
			button->press_time=millis();//记录按下的时间点
			button->in_time=millis();//记录按下的时间点
			button->in_press_cnt=0;
		}
		else
		{
			if(millis()-button->press_time>KEEP_LONG_PRESS_LIMIT)//达到持续长按时间限制，声音提示可以松开了
			{
//				beep.period=20;//20*5ms
//				beep.light_on_percent=0.5f;			
//				beep.reset=1;
//				beep.times=1;			
			}
			else if(millis()-button->in_time>IN_PRESS_LIMIT)//持续按下
			{
				button->in_time=millis();
				button->press=IN_PRESS;
				if(button->press==IN_PRESS)  button->in_press_cnt++;
			}
			
		}
	}
  else
	{
		if(button->last_value==0)//按下后释放
		{
			button->release_time=millis();//记录释放时的时间
			if(button->release_time-button->press_time>KEEP_LONG_PRESS_LIMIT)//持续长按按键5S
			{
				button->press=KEEP_LONG_PRESS;
				button->state_lock_time=0;
				
        buzzer_setup(1000,0.5f,4);				
			}
			else if(button->release_time-button->press_time>LONG_PRESS_LIMIT)//长按按键1S
			{
			  button->press=LONG_PRESS;
				button->state_lock_time=0;//5ms*300=1.5S
				
				buzzer_setup(1000,0.5f,1);
			}
			else
			{
			  button->press=SHORT_PRESS;
				button->state_lock_time=0;//5ms*300=1.5S
				
				buzzer_setup(100,0.5f,1);
			}
		}
	}
	button->last_value=button->value;
	
	if(button->press==LONG_PRESS
	 ||button->press==SHORT_PRESS)//按下释放后，程序后台1.5S内无响应，复位按键状态
	{
	  button->state_lock_time++;
		if(button->state_lock_time>=300)
		{			
			 button->press=NO_PRESS;
			 button->state_lock_time=0;
		}
	}
}

/***************************************
函数名:	void read_button_state_all(void)
说明: 读取所有按键状态
入口:	无
出口:	无
备注:	无
作者:	无名创新
***************************************/
void read_button_state_all(void)
{
  for(uint16_t i=0;i<BUTTON_NUM;i++)
	{
	  Read_Button_State_One(&_button.state[i]);
	}
}

