#ifndef __NBUTTON_H
#define __NBUTTON_H


typedef enum {
	UP=0,
	DOWN,
	UP_3D,
	DN_3D,
	LT_3D,
	RT_3D,
	ME_3D,
	K3,
	K2,
	BUTTON_NUM
}BUTTON;

typedef enum
{
	NO_PRESS=0,
	SHORT_PRESS,
  LONG_PRESS,
  IN_PRESS,	
	KEEP_LONG_PRESS,
}press_state;

typedef struct
{
	press_state press;
  uint8_t value;
	uint8_t last_value;	
	GPIO_Regs  *port;
	uint32_t pin;
	uint32_t press_time;
  uint32_t release_time; 
  uint32_t in_time; 
	uint32_t in_press_cnt;
	uint32_t state_lock_time;
}button_state;

typedef struct
{
  button_state state[BUTTON_NUM];
}rc_buttton;

 
#define LONG_PRESS_LIMIT  			1000//1000ms
#define IN_PRESS_LIMIT  				250//250ms
#define KEEP_LONG_PRESS_LIMIT 	5000//持续按下5S




void Button_Init(void);
void read_button_state_all(void);

extern rc_buttton _button;

#endif

