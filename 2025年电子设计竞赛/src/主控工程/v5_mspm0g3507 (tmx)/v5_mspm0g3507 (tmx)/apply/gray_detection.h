#ifndef __GRAY_DETECTION_H
#define __GRAY_DETECTION_H





void gpio_input_init(void);
void gpio_input_check_channel_5(void);
void gray_turn_control_200hz(float *output);
void vision_turn_control_50hz(float yaw,float *output);


void gpio_input_check_channel_12(void);
void gpio_input_check_from_vision(void);
void gpio_input_check_channel_12_with_handle(void);


extern float gray_status[2],gray_status_backup[2][20];

extern float turn_scale,turn_output;
extern uint32_t gray_status_worse,vision_status_worse;


extern controller seektrack_ctrl[2];
extern float startpoint_straightaway_cm;
extern u8 flag_turn,flag_end;
#endif



//#define read_gray_bit1   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT0_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit2   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT1_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit3   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT2_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit4   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT3_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit5   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT4_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit6   (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT5_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit7   (DL_GPIO_readPins(PORTB_PORT,PORTB_GRAY_BIT6_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit8   (DL_GPIO_readPins(PORTB_PORT,PORTB_GRAY_BIT7_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit9   (DL_GPIO_readPins(PORTB_PORT,PORTB_GRAY_BIT8_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit10  (DL_GPIO_readPins(PORTB_PORT,PORTB_GRAY_BIT9_PIN) != 0 ? 0x01 : 0x00)
//#define read_gray_bit11  (DL_GPIO_readPins(PORTA_PORT,PORTA_GRAY_BIT10_PIN)!= 0 ? 0x01 : 0x00)
//#define read_gray_bit12  (DL_GPIO_readPins(PORTB_PORT,PORTB_GRAY_BIT11_PIN)!= 0 ? 0x01 : 0x00)















