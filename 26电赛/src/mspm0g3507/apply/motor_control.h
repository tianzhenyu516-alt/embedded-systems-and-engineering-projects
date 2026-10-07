#ifndef __MOTOR_CONTROL_H
#define __MOTOR_CONTROL_H




void speed_control_100hz(uint8_t _speed_ctrl_mode);
void motor_output(uint8_t _speed_ctrl_mode);

extern float speed_expect[2];
extern float speed_feedback[2];
extern float speed_output[2];
extern float speed_integral[2];
extern float speed_setup;
extern float motion_ctrl_pwm,turn_ctrl_pwm;
extern uint8_t  speed_ctrl_mode;

extern float speed_kp,speed_ki,speed_kd;

extern float balance_speed_kp,balance_speed_ki,balance_speed_kd;

extern float balance_speed_output,balance_last_speed_output,speed_smooth_output;
extern uint16_t speed_smooth_output_cnt;


extern motor_config trackless_motor;

extern int16_t motion_test_pwm_default;
#endif



