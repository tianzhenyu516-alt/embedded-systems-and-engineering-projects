#ifndef __SENSOR_H
#define __SENSOR_H


void imu_data_sampling(void);
void trackless_ahrs_update(void);
void simulation_pwm_init(void);
void imu_temperature_ctrl(void);
void simulation_pwm_output(void);
void get_wheel_speed(void);
void temperature_state_check(void);


extern sensor smartcar_imu;


#endif

