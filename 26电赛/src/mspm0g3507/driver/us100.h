#ifndef __US100_H
#define __US100_H



typedef struct
{
	uint32_t rf_start_time;
	uint32_t rf_end_time;
	uint32_t rf_delta;
	uint8_t rf_update_flag;
	float distance;
	float last_distance;
	float pre_last_distance;
	float vel;
	float acc;
	float last_vel;
	uint32_t rf_rssi_cnt;
	uint16_t cnt;
	uint8_t sensor_type;
	uint8_t sensor_init_type;
}_rangefinder;


void rangefinder_init(void);
void us100_statemachine(void);
void rangefinder_statemachine(void);


extern uint8_t  com3_rx_buf[4];
extern uint16_t com3_rx_cnt;
extern _rangefinder rangefinder;



#endif



