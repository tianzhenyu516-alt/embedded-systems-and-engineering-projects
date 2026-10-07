#include "headfile.h"
#include "ui.h"

int16_t page_number=0;

#define LONG_PRESS_MAX  5000
#define Page_Number_Max 32//20

/***************************************************
函数名: void Key_Scan(void)
说明:	按键扫描
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void Key_Scan(void)
{
	if(_button.state[UP].press==SHORT_PRESS)
	{
		page_number--;
		if(page_number<0) page_number=Page_Number_Max-1;
		_button.state[UP].press=NO_PRESS;
		LCD_CLS();
	}

	if(_button.state[DOWN].press==SHORT_PRESS)
	{
		page_number++;
		if(page_number>Page_Number_Max-1) page_number=0;
		_button.state[DOWN].press=NO_PRESS;
		LCD_CLS();
	}
	
	if(_button.state[ME_3D].press==LONG_PRESS)//中间按键长按为触发
	{
		_button.state[ME_3D].press=NO_PRESS;
		if(trackless_output.unlock_flag==LOCK)	trackless_output.unlock_flag=UNLOCK;//长按后解锁
		else trackless_output.unlock_flag=LOCK;//长按后上锁
		flight_subtask_reset();	//复位sdk子任务状态量
	}
}

/***************************************************
函数名: void screen_display(void)
说明:	屏幕显示与刷新
入口:	无
出口:	无
备注:	无
作者:	无名创新
****************************************************/
void screen_display(void)
{
	Key_Scan();
	switch(page_number)
	{
		case 0:
		{
			LCD_clear_L(0,0);																										write_6_8_number_f1(0,0,smartcar_imu.vbat);				
																																					display_6_8_number(35,0,smartcar_imu.temperature_stable_flag);
																																					display_6_8_number(45,0,smartcar_imu.imu_cal_flag);
																																					display_6_8_number(55,0,smartcar_imu.imu_convergence_flag);
																																					display_6_8_number(65,0,trackless_output.unlock_flag);
																																					write_6_8_number_f1(75,0,smartcar_imu.temperature_filter);
																																					display_6_8_number(115,0,page_number+1);
			LCD_clear_L(0,1);	display_6_8_string(0,1,"enc_LR");									display_6_8_number(45,1,NEncoder.left_motor_cnt);  
																																					display_6_8_number(90,1,NEncoder.right_motor_cnt);
			LCD_clear_L(0,2);	display_6_8_string(0,2,"cms_LR");                 display_6_8_number_pro(45,2,smartcar_imu.left_motor_speed_cmps);  
																																					display_6_8_number_pro(90,2,smartcar_imu.right_motor_speed_cmps);
			LCD_clear_L(0,3);	display_6_8_string(0,3,"gray_e");								  display_6_8_number_pro(45,3,gray_status[0]);
																																					display_6_8_number_pro(75,3,gray_status[1]);   
																																					display_6_8_number_pro(90,3,turn_output);
			LCD_clear_L(0,4);	display_6_8_string(0,4,"gray");								    display_6_8_number_pro(30,4,startpoint_straightaway_cm); 
																																					display_6_8_number_pro(80,4,gray_status_worse);
			LCD_clear_L(0,5);	display_6_8_string(0,5,"vel_exp");								display_6_8_number_pro(60,5,speed_setup);
			LCD_clear_L(0,6);	display_6_8_string(0,6,"mode");								    display_6_8_number_pro(60,6,sdk_work_mode);
																																					write_6_8_number_f1(90,6,rangefinder.distance);
			
			LCD_clear_L(0,7);																								    write_6_8_number_f1(0,7,smartcar_imu.rpy_deg[0]);
																																					write_6_8_number_f1(40,7,smartcar_imu.rpy_deg[1]);
																																					write_6_8_number_f1(80,7,smartcar_imu.rpy_deg[2]);
			static uint8_t ver_choose=1;
			display_6_8_string(50,ver_choose+4,"*");
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<1) ver_choose=2;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>2) ver_choose=1;		
			}

			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						speed_setup+=1;
						speed_setup=constrain_float(speed_setup,-200,200);
						WriteFlashParameter(SPEED_SETUP,speed_setup,&Trackless_Params);
					}
					break;
					case 2:
					{
						sdk_work_mode+=1;
						sdk_work_mode=constrain_float(sdk_work_mode,-32,32);
						WriteFlashParameter(WORK_MODE,sdk_work_mode,&Trackless_Params);
					}
					break;				
				}
			}

			//通过3D按键来实现可以实现选中的参数行减小调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						speed_setup-=1;
						speed_setup=constrain_float(speed_setup,-200,200);
						WriteFlashParameter(SPEED_SETUP,speed_setup,&Trackless_Params);
					}
					break;
					case 2:
					{
						sdk_work_mode-=1;
						sdk_work_mode=constrain_float(sdk_work_mode,-32,32);
						WriteFlashParameter(WORK_MODE,sdk_work_mode,&Trackless_Params);
					}
					break;				
				}
			}

			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==LONG_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						speed_setup+=20;
						speed_setup=constrain_float(speed_setup,-200,200);
						WriteFlashParameter(SPEED_SETUP,speed_setup,&Trackless_Params);
					}
					break;			
				}
			}
			
			//通过3D按键来实现可以实现选中的参数行减小调整
			if(_button.state[LT_3D].press==LONG_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						speed_setup-=20;
						speed_setup=constrain_float(speed_setup,-200,200);
						WriteFlashParameter(SPEED_SETUP,speed_setup,&Trackless_Params);
					}
					break;			
				}
			}
			
		}
		break;
		case 1:
		{
			LCD_clear_L(0,0);	display_6_8_string(0,0,"imu"); 										display_6_8_number(25,0,smartcar_imu.temperature_stable_flag);
																																					display_6_8_number(35,0,smartcar_imu.imu_cal_flag);
																																					display_6_8_number_pro(50,0,smartcar_imu.temperature_filter); 	
																																					display_6_8_number(110,0,page_number+1);
			LCD_clear_L(0,1);	display_6_8_string(0,1,"a_g");		 							  display_6_8_string(90,1,"g_d");						    
			LCD_clear_L(0,2);	display_6_8_string(0,2,"x");											display_6_8_number_pro(20,2,smartcar_imu.accel_g_raw.x); 	display_6_8_number_pro(90,2,smartcar_imu.gyro_dps_raw.x); 
			LCD_clear_L(0,3);	display_6_8_string(0,3,"y");											display_6_8_number_pro(20,3,smartcar_imu.accel_g_raw.y);  display_6_8_number_pro(90,3,smartcar_imu.gyro_dps_raw.y);
			LCD_clear_L(0,4);	display_6_8_string(0,4,"z");											display_6_8_number_pro(20,4,smartcar_imu.accel_g_raw.z);  display_6_8_number_pro(90,4,smartcar_imu.gyro_dps_raw.z);
			
			LCD_clear_L(0,5);	display_6_8_string(0,5,"x");											display_6_8_number_pro(20,5,smartcar_imu.accel_g.x); 	display_6_8_number_pro(90,5,smartcar_imu.gyro_dps.x); 
			LCD_clear_L(0,6);	display_6_8_string(0,6,"y");											display_6_8_number_pro(20,6,smartcar_imu.accel_g.y);  display_6_8_number_pro(90,6,smartcar_imu.gyro_dps.y);
			LCD_clear_L(0,7);	display_6_8_string(0,7,"z");											display_6_8_number_pro(20,7,smartcar_imu.accel_g.z);  display_6_8_number_pro(90,7,smartcar_imu.gyro_dps.z);
			
			//通过3D按键来实现校准
			if(_button.state[ME_3D].press==SHORT_PRESS)
			{
				_button.state[ME_3D].press=NO_PRESS;
				smartcar_imu.imu_cal_flag=0;//重新校准加速度、陀螺仪
			}
		}
		break;	
		case 2:
		{
			LCD_clear_L(0,0);	 display_6_8_number(120,0,page_number+1);
											   display_6_8_string(0,0,"ch1:");display_6_8_number(30,0,ppm_rc.buf[0]);display_6_8_number(60,0,NCLINK_PPM_Databuf[0]);display_6_8_number(90,0,bluetooth_ppm[0]);
			LCD_clear_L(0,1);  display_6_8_string(0,1,"ch2:");display_6_8_number(30,1,ppm_rc.buf[1]);display_6_8_number(60,1,NCLINK_PPM_Databuf[1]);display_6_8_number(90,1,bluetooth_ppm[1]);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"ch3:");display_6_8_number(30,2,ppm_rc.buf[2]);display_6_8_number(60,2,NCLINK_PPM_Databuf[2]);display_6_8_number(90,2,bluetooth_ppm[2]);
			LCD_clear_L(0,3);  display_6_8_string(0,3,"ch4:");display_6_8_number(30,3,ppm_rc.buf[3]);display_6_8_number(60,3,NCLINK_PPM_Databuf[3]);display_6_8_number(90,3,bluetooth_ppm[3]);
			LCD_clear_L(0,4);  display_6_8_string(0,4,"ch5:");display_6_8_number(30,4,ppm_rc.buf[4]);display_6_8_number(60,4,NCLINK_PPM_Databuf[4]);display_6_8_number(90,4,bluetooth_ppm[4]);
			LCD_clear_L(0,5);  display_6_8_string(0,5,"ch6:");display_6_8_number(30,5,ppm_rc.buf[5]);display_6_8_number(60,5,NCLINK_PPM_Databuf[5]);display_6_8_number(90,5,bluetooth_ppm[5]);
			LCD_clear_L(0,6);  display_6_8_string(0,6,"ch7:");display_6_8_number(30,6,ppm_rc.buf[6]);display_6_8_number(60,6,NCLINK_PPM_Databuf[6]);display_6_8_number(90,6,bluetooth_ppm[6]);
			LCD_clear_L(0,7);  display_6_8_string(0,7,"ch8:");display_6_8_number(30,7,ppm_rc.buf[7]);display_6_8_number(60,7,NCLINK_PPM_Databuf[7]);display_6_8_number(90,7,bluetooth_ppm[7]);
		}
		break;
		case 3:
		{
			LCD_clear_L(0,0);	 display_6_8_number(110,0,page_number+1);
											   display_6_8_string(0,0,"fusion:");
			LCD_clear_L(0,1);  display_6_8_string(0,1,"roll:"); display_6_8_number_pro(35,1,smartcar_imu.rpy_deg[_ROL]);
																													display_6_8_number_pro(85,1,smartcar_imu.rpy_gyro_dps[_ROL]);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"pitch:");display_6_8_number_pro(35,2,smartcar_imu.rpy_deg[_PIT]);
																													display_6_8_number_pro(85,2,smartcar_imu.rpy_gyro_dps[_PIT]);
			LCD_clear_L(0,3);  display_6_8_string(0,3,"yaw:");  display_6_8_number_pro(35,3,smartcar_imu.rpy_deg[_YAW]);
																													display_6_8_number_pro(85,3,smartcar_imu.rpy_gyro_dps[_YAW]);
			
			LCD_clear_L(0,4);  display_6_8_string(0,4,"E_acc:");  display_6_8_number_pro(85,4,smartcar_imu.accel_earth_cmpss.x);
			LCD_clear_L(0,5);  display_6_8_string(0,5,"N_acc:");  display_6_8_number_pro(85,5,smartcar_imu.accel_earth_cmpss.y);
			LCD_clear_L(0,6);  display_6_8_string(0,6,"U_acc:");  display_6_8_number_pro(85,6,smartcar_imu.accel_earth_cmpss.z);
			
		}
		break;	
		case 4:
		{
			LCD_clear_L(0,0);	 display_6_8_string(0,0,"turn_kp1:");display_6_8_number(70,0,seektrack_ctrl[0].kp);   display_6_8_number(110,0,page_number+1);
			LCD_clear_L(0,1);  display_6_8_string(0,1,"turn_ki1:");display_6_8_number(70,1,seektrack_ctrl[0].ki);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"turn_kd1:");display_6_8_number(70,2,seektrack_ctrl[0].kd);
			LCD_clear_L(0,3);  display_6_8_string(0,3,"turn_sc:");display_6_8_number(70,3,turn_scale);
			LCD_clear_L(0,4);  display_6_8_string(0,4,"gyro_kp:");display_6_8_number(70,4,steergyro_ctrl.kp);
			LCD_clear_L(0,5);  display_6_8_string(0,5,"gyro_ki:");display_6_8_number(70,5,steergyro_ctrl.ki);
			LCD_clear_L(0,6);  display_6_8_string(0,6,"gyro_kd:");display_6_8_number(70,6,steergyro_ctrl.kd);
			LCD_clear_L(0,7);  display_6_8_string(0,7,"gyro_sc:");display_6_8_number(70,7,steer_gyro_scale);

			static int8_t ver_choose=0;
			display_6_8_string(60,ver_choose,"*");
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<0) ver_choose=7;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>7) ver_choose=0;		
			}

			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						seektrack_ctrl[0].kp+=1;
						seektrack_ctrl[0].kp=constrain_float(seektrack_ctrl[0].kp,0,1000);
						WriteFlashParameter(CTRL_TURN_KP1,			seektrack_ctrl[0].kp,					&Trackless_Params);
					}
					break;
					case 1:
					{
						seektrack_ctrl[0].ki+=1;
						seektrack_ctrl[0].ki=constrain_float(seektrack_ctrl[0].ki,0,1000);
						WriteFlashParameter(CTRL_TURN_KI1,			seektrack_ctrl[0].ki,					&Trackless_Params);
					}
					break;
					case 2:
					{
						seektrack_ctrl[0].kd+=1;
						seektrack_ctrl[0].kd=constrain_float(seektrack_ctrl[0].kd,0,1000);
						WriteFlashParameter(CTRL_TURN_KD1,			seektrack_ctrl[0].kd,					&Trackless_Params);
					}
					break;
					case 3:
					{
						turn_scale+=0.01f;
						turn_scale=constrain_float(turn_scale,0,1);
						WriteFlashParameter(CTRL_TURN_SCALE,	turn_scale,				&Trackless_Params);
					}
					break;
					case 4:
					{
						steergyro_ctrl.kp+=0.1f;
						steergyro_ctrl.kp=constrain_float(steergyro_ctrl.kp,0,1000);
						WriteFlashParameter(CTRL_GYRO_KP,			steergyro_ctrl.kp,		&Trackless_Params);
					}
					break;
					case 5:
					{
						steergyro_ctrl.ki+=0.1f;
						steergyro_ctrl.ki=constrain_float(steergyro_ctrl.ki,0,1000);
						WriteFlashParameter(CTRL_GYRO_KI,			steergyro_ctrl.ki,		&Trackless_Params);
					}
					break;
					case 6:
					{
						steergyro_ctrl.kd+=0.1f;
						steergyro_ctrl.kd=constrain_float(steergyro_ctrl.kd,0,1000);
						WriteFlashParameter(CTRL_GYRO_KD,			steergyro_ctrl.kd,		&Trackless_Params);
					}
					break;
					case 7:
					{
						steer_gyro_scale+=0.01f;
						steer_gyro_scale=constrain_float(steer_gyro_scale,0,1);
						WriteFlashParameter(CTRL_GYRO_SCALE,	steer_gyro_scale,	&Trackless_Params);
					}
					break;						
				}
			}

			//通过3D按键来实现可以实现选中的参数行自减小调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						seektrack_ctrl[0].kp-=1;
						seektrack_ctrl[0].kp=constrain_float(seektrack_ctrl[0].kp,0,1000);
						WriteFlashParameter(CTRL_TURN_KP1,			seektrack_ctrl[0].kp,					&Trackless_Params);
					}
					break;
					case 1:
					{
						seektrack_ctrl[0].ki-=1;
						seektrack_ctrl[0].ki=constrain_float(seektrack_ctrl[0].ki,0,1000);
						WriteFlashParameter(CTRL_TURN_KI1,			seektrack_ctrl[0].ki,					&Trackless_Params);
					}
					break;
					case 2:
					{
						seektrack_ctrl[0].kd-=1;
						seektrack_ctrl[0].kd=constrain_float(seektrack_ctrl[0].kd,0,1000);
						WriteFlashParameter(CTRL_TURN_KD1,			seektrack_ctrl[0].kd,					&Trackless_Params);
					}
					break;
					case 3:
					{
						turn_scale-=0.01f;
						turn_scale=constrain_float(turn_scale,0,1);
						WriteFlashParameter(CTRL_TURN_SCALE,	turn_scale,				&Trackless_Params);
					}
					break;
					case 4:
					{
						steergyro_ctrl.kp-=0.1f;
						steergyro_ctrl.kp=constrain_float(steergyro_ctrl.kp,0,1000);
						WriteFlashParameter(CTRL_GYRO_KP,			steergyro_ctrl.kp,		&Trackless_Params);
					}
					break;
					case 5:
					{
						steergyro_ctrl.ki-=0.1f;
						steergyro_ctrl.ki=constrain_float(steergyro_ctrl.ki,0,1000);
						WriteFlashParameter(CTRL_GYRO_KI,			steergyro_ctrl.ki,		&Trackless_Params);
					}
					break;
					case 6:
					{
						steergyro_ctrl.kd-=0.1f;
						steergyro_ctrl.kd=constrain_float(steergyro_ctrl.kd,0,1000);
						WriteFlashParameter(CTRL_GYRO_KD,			steergyro_ctrl.kd,		&Trackless_Params);
					}
					break;
					case 7:
					{
						steer_gyro_scale-=0.01f;
						steer_gyro_scale=constrain_float(steer_gyro_scale,0,1);
						WriteFlashParameter(CTRL_GYRO_SCALE,	steer_gyro_scale,	&Trackless_Params);
					}
					break;						
				}

			}		
		}
		break;
		case 5:
		{
			LCD_clear_L(0,0);	 display_6_8_string(0,0,"speed_kp:");display_6_8_number(70,0,speed_kp);   display_6_8_number(110,0,page_number+1);
			LCD_clear_L(0,1);  display_6_8_string(0,1,"speed_ki:");display_6_8_number(70,1,speed_ki);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"speed_kd:");display_6_8_number(70,2,speed_kd);
			
			LCD_clear_L(0,3);	 display_6_8_string(0,3,"turn_kp2:");display_6_8_number(70,3,seektrack_ctrl[1].kp);   
			LCD_clear_L(0,4);  display_6_8_string(0,4,"turn_ki2:");display_6_8_number(70,4,seektrack_ctrl[1].ki);
			LCD_clear_L(0,5);  display_6_8_string(0,5,"turn_kd2:");display_6_8_number(70,5,seektrack_ctrl[1].kd);
			
			static int8_t ver_choose=0;
			display_6_8_string(60,ver_choose,"*");
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<0) ver_choose=5;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>5) ver_choose=0;		
			}

			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						speed_kp+=0.1f;
						speed_kp=constrain_float(speed_kp,0,1000);
						WriteFlashParameter(CTRL_SPEED_KP,			speed_kp,						 &Trackless_Params);
					}
					break;
					case 1:
					{
						speed_ki+=0.01f;
						speed_ki=constrain_float(speed_ki,0,1000);
						WriteFlashParameter(CTRL_SPEED_KI,			speed_ki,						 &Trackless_Params);
					}
					break;
					case 2:
					{
						speed_kd+=1;
						speed_kd=constrain_float(speed_kd,0,1000);
						WriteFlashParameter(CTRL_SPEED_KD,			speed_kd,						 &Trackless_Params);
					}
					break;
					case 3:
					{
						seektrack_ctrl[1].kp+=1;
						seektrack_ctrl[1].kp=constrain_float(seektrack_ctrl[1].kp,0,1000);
						WriteFlashParameter(CTRL_TURN_KP2,			seektrack_ctrl[1].kp,&Trackless_Params);
					}
					break;
					case 4:
					{
						seektrack_ctrl[1].ki+=1;
						seektrack_ctrl[1].ki=constrain_float(seektrack_ctrl[1].ki,0,1000);
						WriteFlashParameter(CTRL_TURN_KI2,			seektrack_ctrl[1].ki,&Trackless_Params);
					}
					break;
					case 5:
					{
						seektrack_ctrl[1].kd+=1;
						seektrack_ctrl[1].kd=constrain_float(seektrack_ctrl[1].kd,0,1000);
						WriteFlashParameter(CTRL_TURN_KD2,			seektrack_ctrl[1].kd,&Trackless_Params);
					}
					break;					
				}		
			}

			//通过3D按键来实现可以实现选中的参数行自减小调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						speed_kp-=0.1f;
						speed_kp=constrain_float(speed_kp,0,1000);
						WriteFlashParameter(CTRL_SPEED_KP,			speed_kp,						 &Trackless_Params);
					}
					break;
					case 1:
					{
						speed_ki-=0.01f;
						speed_ki=constrain_float(speed_ki,0,1000);
						WriteFlashParameter(CTRL_SPEED_KI,			speed_ki,						 &Trackless_Params);
					}
					break;
					case 2:
					{
						speed_kd-=1;
						speed_kd=constrain_float(speed_kd,0,1000);
						WriteFlashParameter(CTRL_SPEED_KD,			speed_kd,						 &Trackless_Params);
					}
					break;
					case 3:
					{
						seektrack_ctrl[1].kp-=1;
						seektrack_ctrl[1].kp=constrain_float(seektrack_ctrl[1].kp,0,1000);
						WriteFlashParameter(CTRL_TURN_KP2,			seektrack_ctrl[1].kp,&Trackless_Params);
					}
					break;
					case 4:
					{
						seektrack_ctrl[1].ki-=1;
						seektrack_ctrl[1].ki=constrain_float(seektrack_ctrl[1].ki,0,1000);
						WriteFlashParameter(CTRL_TURN_KI2,			seektrack_ctrl[1].ki,&Trackless_Params);
					}
					break;
					case 5:
					{
						seektrack_ctrl[1].kd-=1;
						seektrack_ctrl[1].kd=constrain_float(seektrack_ctrl[1].kd,0,1000);
						WriteFlashParameter(CTRL_TURN_KD2,			seektrack_ctrl[1].kd,&Trackless_Params);
					}
					break;						
				}
			}	
		}
		break;
		case 6:
		{
			LCD_clear_L(0,0);	 display_6_8_number(110,0,page_number+1);
											   display_6_8_string(0,0,"speed:");display_6_8_number(50,0,smartcar_imu.state_estimation.speed);
			LCD_clear_L(0,1);  display_6_8_string(0,1,"azimu:");display_6_8_number(50,1,smartcar_imu.state_estimation.azimuth);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"pos_x:");display_6_8_number(50,2,smartcar_imu.state_estimation.pos.x);
			LCD_clear_L(0,3);  display_6_8_string(0,3,"pos_y:");display_6_8_number(50,3,smartcar_imu.state_estimation.pos.y);
			//LCD_clear_L(0,4);  display_6_8_string(0,4,"ch5:");	display_6_8_number(50,4,0);
			//LCD_clear_L(0,5);  display_6_8_string(0,5,"ch6:");	display_6_8_number(50,5,0);
			//LCD_clear_L(0,6);  display_6_8_string(0,6,"ch7:");	display_6_8_number(50,6,0);
			//LCD_clear_L(0,7);  display_6_8_string(0,7,"ch8:");	display_6_8_number(50,7,0);		
		}
		break;
		case 7:
		{
				ssd1306_clear_display();
				ssd1306_draw_line(0,32,128,32,WHITE);
				ssd1306_draw_line(64,0,64,64,WHITE);
			
				uint16_t x,y;
				y=32-32*constrain_float(0.5*camera1.height-camera1.y,-50,50)/50.0f;
				x=64-32*constrain_float(0.5*camera1.width-camera1.x,-50,50)/50.0f;
				if(camera1.flag==1)			ssd1306_fill_circle(x,y,5,WHITE);
				else ssd1306_draw_circle(x,y,5,WHITE);			
				
				ssd1306_display();
				display_6_8_string(0,0,"point_x:");  write_6_8_number(80,0,camera1.x);	write_6_8_number(105,0,page_number+1);
				display_6_8_string(0,1,"point_y::"); write_6_8_number(80,1,camera1.y);  write_6_8_number(105,1,camera1.sdk_mode-0xA0);
				display_6_8_string(0,2,"point_s:");  write_6_8_number(80,2,camera1.pixel);
				display_6_8_string(0,3,"point_f:");  write_6_8_number(80,3,camera1.flag);
				display_6_8_string(0,4,"Tar_x:");    write_6_8_number(80,4,camera1.sdk_target.x);
				display_6_8_string(0,5,"Tar_y:");    write_6_8_number(80,5,camera1.sdk_target.y); 
				display_6_8_string(0,6,"FPS:");      write_6_8_number(80,6,camera1.fps);
				display_6_8_string(0,7,"Oth:");      write_6_8_number(25,7,camera1.angle);
																						 write_6_8_number(75,7,camera1.distance);			
																						 write_6_8_number(120,7,camera1.apriltag_id);		
		
		}
		break;
		case 8:
		{
			controller *angle_ctrl=&selfbalance_angle1_ctrl;
 			
			LCD_clear_L(0,0);	 display_6_8_string(0,0,"a_kp:"); display_6_8_number(40,0,angle_ctrl->kp);   display_6_8_number(110,0,page_number+1);
			LCD_clear_L(0,1);  display_6_8_string(0,1,"a_ki:"); display_6_8_number(40,1,angle_ctrl->ki);   display_6_8_number(90,1,smartcar_imu.rpy_kalman_deg[1]);
			LCD_clear_L(0,2);  display_6_8_string(0,2,"a_kd:"); display_6_8_number(40,2,angle_ctrl->kd);   display_6_8_number(90,2,smartcar_imu.gyro_dps.x);
			
			LCD_clear_L(0,3);	 display_6_8_string(0,3,"g_kp:"); display_6_8_number(40,3,selfbalance_gyro_ctrl.kp);			display_6_8_number(90,3,balance_angle_output);   
			LCD_clear_L(0,4);  display_6_8_string(0,4,"g_ki:"); display_6_8_number(40,4,selfbalance_gyro_ctrl.ki);      display_6_8_number(90,4,speed_smooth_output);
			LCD_clear_L(0,5);  display_6_8_string(0,5,"g_kd:"); display_6_8_number(40,5,selfbalance_gyro_ctrl.kd);      display_6_8_number(90,5,motion_ctrl_pwm);
			
			LCD_clear_L(0,6);	 display_6_8_string(0,6,"a_s:");	display_6_8_number(40,6,balance_angle_expect);   
																													display_6_8_number(80,6,balance_speed_ctrl_enable); 
																													display_6_8_number(100,6,balance_steer_ctrl_enable);
			                                                    display_6_8_number(120,6,balance_ctrl_loop_num);
			LCD_clear_L(0,7);	 display_6_8_string(0,7,"v_kp/ki:");display_6_8_number(60,7,balance_speed_kp); display_6_8_number(90,7,balance_speed_ki);
			
			static int8_t ver_choose=0;
			
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<0) ver_choose=11;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>11) ver_choose=0;		
			}
	
			if(ver_choose<=6) display_6_8_string(32,ver_choose,"*");
			else if(ver_choose==7) display_6_8_string(70,6,"*");
			else if(ver_choose==8) display_6_8_string(90,6,"*");
			else if(ver_choose==9) display_6_8_string(110,6,"*");
			else if(ver_choose==10) display_6_8_string(50,7,"*");
			else if(ver_choose==11) display_6_8_string(80,7,"*");

			
			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						angle_ctrl->kp+=0.5f;
						angle_ctrl->kp=constrain_float(angle_ctrl->kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KP,			angle_ctrl->kp,						 &Trackless_Params);
					}
					break;
					case 1:
					{
						angle_ctrl->ki+=0.01f;
						angle_ctrl->ki=constrain_float(angle_ctrl->ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KI,			angle_ctrl->ki,						 &Trackless_Params);
					}
					break;
					case 2:
					{
						angle_ctrl->kd+=0.1f;
						angle_ctrl->kd=constrain_float(angle_ctrl->kd,-1000,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KD,			angle_ctrl->kd,						 &Trackless_Params);
					}
					break;
					case 3:
					{
						selfbalance_gyro_ctrl.kp+=0.1f;
						selfbalance_gyro_ctrl.kp=constrain_float(selfbalance_gyro_ctrl.kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KP,			  selfbalance_gyro_ctrl.kp,&Trackless_Params);
					}
					break;
					case 4:
					{
						selfbalance_gyro_ctrl.ki+=0.01f;
						selfbalance_gyro_ctrl.ki=constrain_float(selfbalance_gyro_ctrl.ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KI,			  selfbalance_gyro_ctrl.ki,&Trackless_Params);
					}
					break;
					case 5:
					{
						selfbalance_gyro_ctrl.kd+=0.1f;
						selfbalance_gyro_ctrl.kd=constrain_float(selfbalance_gyro_ctrl.kd,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KD,			  selfbalance_gyro_ctrl.kd,&Trackless_Params);
					}
					break;
					case 6:
					{
						balance_angle_expect+=0.1f;
						balance_angle_expect=constrain_float(balance_angle_expect,-180,180);
						WriteFlashParameter(BALANCE_ANGLE_EXPECT,				balance_angle_expect,&Trackless_Params);
					}
					break;
					case 7:
					{
						 if(balance_speed_ctrl_enable==0)	balance_speed_ctrl_enable=1;
						 else balance_speed_ctrl_enable=0;
						 WriteFlashParameter(BALANCE_VEL_CTRL_ENABLE,	  balance_speed_ctrl_enable,&Trackless_Params);
					}
					break;
					case 8:
					{
						 if(balance_steer_ctrl_enable==0)	balance_steer_ctrl_enable=1;
						 else balance_steer_ctrl_enable=0;
						 WriteFlashParameter(BALANCE_DIR_CTRL_ENABLE,	  balance_steer_ctrl_enable,&Trackless_Params);
					}
					break;
					case 9:
					{
						 if(balance_ctrl_loop_num==1)	balance_ctrl_loop_num=2;
						 else balance_ctrl_loop_num=1;
						 WriteFlashParameter(BALANCE_CTRL_NUMBER,	      balance_ctrl_loop_num,&Trackless_Params);
					}
					break;						
					case 10:
					{
						balance_speed_kp+=1.0f;
						balance_speed_kp=constrain_float(balance_speed_kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_SPEED_KP,			balance_speed_kp,&Trackless_Params);
					}
					break;	
					case 11:
					{
						balance_speed_ki+=1.0f;
						balance_speed_ki=constrain_float(balance_speed_ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_SPEED_KI,			balance_speed_ki,&Trackless_Params);	
					}
					break;						
				}		
			}
			
			//通过3D按键来实现可以实现选中的参数行自减小调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 0:
					{
						angle_ctrl->kp-=0.5f;
						angle_ctrl->kp=constrain_float(angle_ctrl->kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KP,			angle_ctrl->kp,						 &Trackless_Params);
					}
					break;
					case 1:
					{
						angle_ctrl->ki-=0.01f;
						angle_ctrl->ki=constrain_float(angle_ctrl->ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KI,			angle_ctrl->ki,						 &Trackless_Params);
					}
					break;
					case 2:
					{
						angle_ctrl->kd-=0.1f;
						angle_ctrl->kd=constrain_float(angle_ctrl->kd,-1000,1000);
						WriteFlashParameter(CTRL_BALANCE_ANGLE1_KD,			angle_ctrl->kd,						 &Trackless_Params);
					}
					break;
					case 3:
					{
						selfbalance_gyro_ctrl.kp-=0.1f;
						selfbalance_gyro_ctrl.kp=constrain_float(selfbalance_gyro_ctrl.kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KP,			  selfbalance_gyro_ctrl.kp,&Trackless_Params);
					}
					break;
					case 4:
					{
						selfbalance_gyro_ctrl.ki-=0.01f;
						selfbalance_gyro_ctrl.ki=constrain_float(selfbalance_gyro_ctrl.ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KI,			  selfbalance_gyro_ctrl.ki,&Trackless_Params);
					}
					break;
					case 5:
					{
						selfbalance_gyro_ctrl.kd-=0.1f;
						selfbalance_gyro_ctrl.kd=constrain_float(selfbalance_gyro_ctrl.kd,0,1000);
						WriteFlashParameter(CTRL_BALANCE_GYRO_KD,			  selfbalance_gyro_ctrl.kd,&Trackless_Params);
					}
					break;
					case 6:
					{
						balance_angle_expect-=0.1f;
						balance_angle_expect=constrain_float(balance_angle_expect,-180,180);
						WriteFlashParameter(BALANCE_ANGLE_EXPECT,				balance_angle_expect,&Trackless_Params);
					}
					break;
					case 7:
					{
						 if(balance_speed_ctrl_enable==0)	balance_speed_ctrl_enable=1;
						 else balance_speed_ctrl_enable=0;
						 WriteFlashParameter(BALANCE_VEL_CTRL_ENABLE,	  balance_speed_ctrl_enable,&Trackless_Params);
					}
					break;
					case 8:
					{
						 if(balance_steer_ctrl_enable==0)	balance_steer_ctrl_enable=1;
						 else balance_steer_ctrl_enable=0;
						 WriteFlashParameter(BALANCE_DIR_CTRL_ENABLE,	  balance_steer_ctrl_enable,&Trackless_Params);
					}
					break;	
					case 9:
					{
						 if(balance_ctrl_loop_num==1)	balance_ctrl_loop_num=2;
						 else balance_ctrl_loop_num=1;
						 WriteFlashParameter(BALANCE_CTRL_NUMBER,	      balance_ctrl_loop_num,&Trackless_Params);
					}
					break;							
					case 10:
					{
						balance_speed_kp-=1.0f;
						balance_speed_kp=constrain_float(balance_speed_kp,0,1000);
						WriteFlashParameter(CTRL_BALANCE_SPEED_KP,			balance_speed_kp,&Trackless_Params);	
					}
					break;	
					case 11:
					{
						balance_speed_ki-=1.0f;
						balance_speed_ki=constrain_float(balance_speed_ki,0,1000);
						WriteFlashParameter(CTRL_BALANCE_SPEED_KI,			balance_speed_ki,&Trackless_Params);	
					}
					break;							
				}
			}
			
			if(_button.state[RT_3D].press==LONG_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 6:
					{
						balance_angle_expect+=10.0f;
						balance_angle_expect=constrain_float(balance_angle_expect,-180,180);
						WriteFlashParameter(BALANCE_ANGLE_EXPECT,				balance_angle_expect,&Trackless_Params);
					}
					break;					
				}
			}
			
			if(_button.state[LT_3D].press==LONG_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 6:
					{
						balance_angle_expect-=10.0f;
						balance_angle_expect=constrain_float(balance_angle_expect,-180,180);
						WriteFlashParameter(BALANCE_ANGLE_EXPECT,				balance_angle_expect,&Trackless_Params);
					}
					break;					
				}
			}			
		}
		break;
		case 9:
		{
			LCD_clear_L(0,0);	display_6_8_string(0,0,"reserved_params");		display_6_8_number(115,0,page_number+1);
				
			LCD_clear_L(0,1);	display_6_8_string(0,1,"speed");			write_6_8_number_f1(45,1,park_params._track_speed_cmps);
			LCD_clear_L(0,2);	display_6_8_string(0,2,"stop1");			write_6_8_number_f1(45,2,park_params._start_point_adjust1);;
			LCD_clear_L(0,3);	display_6_8_string(0,3,"ac123");			write_6_8_number_f1(45,3,park_params._forward_distance_cm);
																															write_6_8_number_f1(75,3,park_params._backward_distance1_cm);
																															write_6_8_number_f1(105,3,park_params._backward_distance2_cm);
			LCD_clear_L(0,4);	display_6_8_string(0,4,"ac45");			  write_6_8_number_f1(45,4,park_params._out_forward_distance1_cm);	
																															write_6_8_number_f1(75,4,park_params._out_forward_distance2_cm);
			
			LCD_clear_L(0,5);	display_6_8_string(0,5,"stop2");			write_6_8_number_f1(45,5,park_params._start_point_adjust2);
			LCD_clear_L(0,6);	display_6_8_string(0,6,"ac12");			  write_6_8_number_f1(45,6,park_params._parallel_backward_distance1_cm);
																															write_6_8_number_f1(75,6,park_params._parallel_backward_distance2_cm);	
			LCD_clear_L(0,7);	display_6_8_string(0,7,"ac3");				write_6_8_number_f1(45,7,park_params._parallel_backward_distance3_cm);
			
			static uint8_t ver_choose=1;
			if(ver_choose==1)				display_6_8_string(35,1,"*");
			else if(ver_choose==2)	display_6_8_string(35,2,"*");
			else if(ver_choose==3)	display_6_8_string(35,3,"*");
			else if(ver_choose==4)	display_6_8_string(68,3,"*");
			else if(ver_choose==5)	display_6_8_string(98,3,"*");
			else if(ver_choose==6)	display_6_8_string(35,4,"*");
			else if(ver_choose==7)	display_6_8_string(68,4,"*");
			else if(ver_choose==8)	display_6_8_string(35,5,"*");
			else if(ver_choose==9)	display_6_8_string(35,6,"*");
			else if(ver_choose==10)	display_6_8_string(68,6,"*");
			else if(ver_choose==11)	display_6_8_string(35,7,"*");
			else display_6_8_string(35,ver_choose,"*");
			
			
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<1) ver_choose=11;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>11) ver_choose=1;		
			}

			park_params._track_speed_cmps=constrain_float(park_params._track_speed_cmps,-100,100);
			park_params._start_point_adjust1=constrain_float(park_params._start_point_adjust1,-100,100);
			park_params._forward_distance_cm=constrain_float(park_params._forward_distance_cm,-100,100);
			park_params._backward_distance1_cm=constrain_float(park_params._backward_distance1_cm,-100,100);
			park_params._backward_distance2_cm=constrain_float(park_params._backward_distance2_cm,-100,100);
			park_params._out_forward_distance1_cm=constrain_float(park_params._out_forward_distance1_cm,-100,100);
			park_params._out_forward_distance2_cm=constrain_float(park_params._out_forward_distance2_cm,-100,100);
			park_params._start_point_adjust2=constrain_float(park_params._start_point_adjust2,-100,100);
			park_params._parallel_backward_distance1_cm=constrain_float(park_params._parallel_backward_distance1_cm,-100,100);
			park_params._parallel_backward_distance2_cm=constrain_float(park_params._parallel_backward_distance2_cm,-100,100);
			park_params._parallel_backward_distance3_cm=constrain_float(park_params._parallel_backward_distance3_cm,-100,100);	
			
			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						park_params._track_speed_cmps+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_1,park_params._track_speed_cmps,&Trackless_Params);
					}
					break;
					case 2:
					{
						park_params._start_point_adjust1+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_2,park_params._start_point_adjust1,&Trackless_Params);
					}
					break;
					case 3:
					{
						park_params._forward_distance_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_3,park_params._forward_distance_cm,&Trackless_Params);
					}
					break;
					case 4:
					{
						park_params._backward_distance1_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_4,park_params._backward_distance1_cm,&Trackless_Params);
					}
					break;
					case 5:
					{
						park_params._backward_distance2_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_5,park_params._backward_distance2_cm,&Trackless_Params);
					}
					break;
					case 6:
					{
						park_params._out_forward_distance1_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_6,park_params._out_forward_distance1_cm,&Trackless_Params);
					}
					break;
					case 7:
					{
						park_params._out_forward_distance2_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_7,park_params._out_forward_distance2_cm,&Trackless_Params);
					}
					break;
					case 8:
					{
						park_params._start_point_adjust2+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_8,park_params._start_point_adjust2,&Trackless_Params);	
					}
					break;
					case 9:
					{
						park_params._parallel_backward_distance1_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_9,park_params._parallel_backward_distance1_cm,&Trackless_Params);
					}
					break;
					case 10:
					{
						park_params._parallel_backward_distance2_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_10,park_params._parallel_backward_distance2_cm,&Trackless_Params);
					}
					break;
					case 11:
					{
						park_params._parallel_backward_distance3_cm+=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_11,park_params._parallel_backward_distance3_cm,&Trackless_Params);
					}
					break;					
				}			
			}	

			//通过3D按键来实现可以实现选中的参数行自增减调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						park_params._track_speed_cmps-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_1,park_params._track_speed_cmps,&Trackless_Params);
					}
					break;
					case 2:
					{
						park_params._start_point_adjust1-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_2,park_params._start_point_adjust1,&Trackless_Params);
					}
					break;
					case 3:
					{
						park_params._forward_distance_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_3,park_params._forward_distance_cm,&Trackless_Params);
					}
					break;
					case 4:
					{
						park_params._backward_distance1_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_4,park_params._backward_distance1_cm,&Trackless_Params);
					}
					break;
					case 5:
					{
						park_params._backward_distance2_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_5,park_params._backward_distance2_cm,&Trackless_Params);
					}
					break;
					case 6:
					{
						park_params._out_forward_distance1_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_6,park_params._out_forward_distance1_cm,&Trackless_Params);
					}
					break;
					case 7:
					{
						park_params._out_forward_distance2_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_7,park_params._out_forward_distance2_cm,&Trackless_Params);
					}
					break;
					case 8:
					{
						park_params._start_point_adjust2-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_8,park_params._start_point_adjust2,&Trackless_Params);	
					}
					break;
					case 9:
					{
						park_params._parallel_backward_distance1_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_9,park_params._parallel_backward_distance1_cm,&Trackless_Params);
					}
					break;
					case 10:
					{
						park_params._parallel_backward_distance2_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_10,park_params._parallel_backward_distance2_cm,&Trackless_Params);
					}
					break;
					case 11:
					{
						park_params._parallel_backward_distance3_cm-=0.1f;
						WriteFlashParameter(RESERVED_PARAMS_11,park_params._parallel_backward_distance3_cm,&Trackless_Params);
					}
					break;
				}					
			}		
		}
		break;
		case Page_Number_Max-1://出厂调试模式
		{
			LCD_clear_L(0,0);	display_6_8_string(0,0,"system params");		display_6_8_number(115,0,page_number+1);
			LCD_clear_L(0,1);	display_6_8_string(0,1,"L&R enc  dir");			display_6_8_number(90,1,trackless_motor.left_encoder_dir_config);display_6_8_number(110,1,trackless_motor.right_encoder_dir_config);
			LCD_clear_L(0,2); display_6_8_string(0,2,"L&R move dir");		  display_6_8_number(90,2,trackless_motor.left_motion_dir_config); display_6_8_number(110,2,trackless_motor.right_motion_dir_config);	
			LCD_clear_L(0,3); display_6_8_string(0,3,"wheel diam cm");    display_6_8_number(90,3,trackless_motor.wheel_radius_cm);
			LCD_clear_L(0,4); display_6_8_string(0,4,"pulse set npc");    display_6_8_number(90,4,trackless_motor.pulse_num_per_circle);
			LCD_clear_L(0,5); display_6_8_string(0,5,"servo mid");        display_6_8_number(65,5,trackless_motor.servo_median_value1);    display_6_8_number(95,5,trackless_motor.servo_median_value2);
			LCD_clear_L(0,6);	display_6_8_string(0,6,"R/B");      		  	display_6_8_number(30,6,rangefinder.sensor_type);
																																		display_6_8_number(50,6,vbat.enable);
																																		write_6_8_number_f1(70,6,vbat.upper);
																																		write_6_8_number_f1(100,6,vbat.lower);
			
			LCD_clear_L(0,7); display_6_8_string(0,7,"L&R_P");				    display_6_8_number(40,7,NEncoder.left_motor_total_cnt);  
																																		display_6_8_number(90,7,NEncoder.right_motor_total_cnt); 

			static uint8_t ver_choose=1;
			if(ver_choose==1)	display_6_8_string(80,1,"*");
			else if(ver_choose==2)	display_6_8_string(100,1,"*");
			else if(ver_choose==3)	display_6_8_string(80,2,"*");
			else if(ver_choose==4)	display_6_8_string(100,2,"*");
			else if(ver_choose==7)	display_6_8_string(58,5,"*");
			else if(ver_choose==8)	display_6_8_string(88,5,"*");
			else if(ver_choose==9)	display_6_8_string(20,6,"*");
			else if(ver_choose==10)	display_6_8_string(40,6,"*");
			else if(ver_choose==11)	display_6_8_string(60,6,"*");
			else if(ver_choose==12)	display_6_8_string(90,6,"*");
			else display_6_8_string(80,ver_choose-2,"*");
			
			//通过3D按键来实现换行选中待修改参数
			if(_button.state[UP_3D].press==SHORT_PRESS)
			{
					_button.state[UP_3D].press=NO_PRESS;
					ver_choose--;
					if(ver_choose<1) ver_choose=12;	
			}
			if(_button.state[DN_3D].press==SHORT_PRESS)
			{
					_button.state[DN_3D].press=NO_PRESS;
					ver_choose++;
					if(ver_choose>12) ver_choose=1;		
			}	
			
			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==SHORT_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						if(trackless_motor.left_encoder_dir_config==0) trackless_motor.left_encoder_dir_config=1;
						else trackless_motor.left_encoder_dir_config=0;
						WriteFlashParameter(LEFT_ENC_DIR_CFG,trackless_motor.left_encoder_dir_config,&Trackless_Params);
					}
					break;
					case 2:
					{
						if(trackless_motor.right_encoder_dir_config==0) trackless_motor.right_encoder_dir_config=1;
						else trackless_motor.right_encoder_dir_config=0;
						WriteFlashParameter(RIGHT_ENC_DIR_CFG,trackless_motor.right_encoder_dir_config,&Trackless_Params);
					}
					break;	
					case 3:
					{
						if(trackless_motor.left_motion_dir_config==0) trackless_motor.left_motion_dir_config=1;
						else trackless_motor.left_motion_dir_config=0;
						WriteFlashParameter(LEFT_MOVE_DIR_CFG,trackless_motor.left_motion_dir_config,&Trackless_Params);
					}
					break;	
					case 4:
					{
						if(trackless_motor.right_motion_dir_config==0) trackless_motor.right_motion_dir_config=1;
						else trackless_motor.right_motion_dir_config=0;
						WriteFlashParameter(RIGHT_MOVE_DIR_CFG,trackless_motor.right_motion_dir_config,&Trackless_Params);
					}
					break;
					case 5:
					{
						trackless_motor.wheel_radius_cm+=0.1f;
						trackless_motor.wheel_radius_cm=constrain_float(trackless_motor.wheel_radius_cm,0,20);
						WriteFlashParameter(TIRE_RADIUS_CM_CFG,trackless_motor.wheel_radius_cm,&Trackless_Params);
					}
					break;	
					case 6:
					{
						trackless_motor.pulse_num_per_circle+=1;
						trackless_motor.pulse_num_per_circle=constrain_float(trackless_motor.pulse_num_per_circle,0,50000);
						WriteFlashParameter(PULSE_NPC_CFG,trackless_motor.pulse_num_per_circle,&Trackless_Params);
					}
					break;
					case 7:
					{
						trackless_motor.servo_median_value1+=1;
						trackless_motor.servo_median_value1=constrain_float(trackless_motor.servo_median_value1,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_1,trackless_motor.servo_median_value1,&Trackless_Params);
					}
					break;
					case 8:
					{
						trackless_motor.servo_median_value2+=1;
						trackless_motor.servo_median_value2=constrain_float(trackless_motor.servo_median_value2,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_2,trackless_motor.servo_median_value2,&Trackless_Params);
					}
					break;
					case 9:
					{
						rangefinder.sensor_type+=1;
						rangefinder.sensor_type=constrain_float(rangefinder.sensor_type,0,100);
						WriteFlashParameter(RANGEFINDER_TYPE,rangefinder.sensor_type,&Trackless_Params);
					}
					break;
					case 10:
					{
						if(vbat.enable==1)	vbat.enable=0;
						else vbat.enable=1;
						WriteFlashParameter(NO_VOLTAGE_ENABLE,vbat.enable,&Trackless_Params);
					}
					break;		
					case 11:
					{
						vbat.upper+=0.1f;
						vbat.upper=constrain_float(vbat.upper,0,100);
						WriteFlashParameter(NO_VOLTAGE_UPPER, vbat.upper, &Trackless_Params);
					}
					break;	
					case 12:
					{
						vbat.lower+=0.1f;
						vbat.lower=constrain_float(vbat.lower,0,100);
						WriteFlashParameter(NO_VOLTAGE_LOWER, vbat.lower, &Trackless_Params);
					}
					break;						
				}
			}
			
			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[LT_3D].press==SHORT_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{
					case 1:
					{
						if(trackless_motor.left_encoder_dir_config==0) trackless_motor.left_encoder_dir_config=1;
						else trackless_motor.left_encoder_dir_config=0;
						WriteFlashParameter(LEFT_ENC_DIR_CFG,trackless_motor.left_encoder_dir_config,&Trackless_Params);
					}
					break;
					case 2:
					{
						if(trackless_motor.right_encoder_dir_config==0) trackless_motor.right_encoder_dir_config=1;
						else trackless_motor.right_encoder_dir_config=0;
						WriteFlashParameter(RIGHT_ENC_DIR_CFG,trackless_motor.right_encoder_dir_config,&Trackless_Params);
					}
					break;	
					case 3:
					{
						if(trackless_motor.left_motion_dir_config==0) trackless_motor.left_motion_dir_config=1;
						else trackless_motor.left_motion_dir_config=0;
						WriteFlashParameter(LEFT_MOVE_DIR_CFG,trackless_motor.left_motion_dir_config,&Trackless_Params);
					}
					break;	
					case 4:
					{
						if(trackless_motor.right_motion_dir_config==0) trackless_motor.right_motion_dir_config=1;
						else trackless_motor.right_motion_dir_config=0;
						WriteFlashParameter(RIGHT_MOVE_DIR_CFG,trackless_motor.right_motion_dir_config,&Trackless_Params);
					}
					break;
					case 5:
					{
						trackless_motor.wheel_radius_cm-=0.1f;
						trackless_motor.wheel_radius_cm=constrain_float(trackless_motor.wheel_radius_cm,0,20);
						WriteFlashParameter(TIRE_RADIUS_CM_CFG,trackless_motor.wheel_radius_cm,&Trackless_Params);
					}
					break;	
					case 6:
					{
						trackless_motor.pulse_num_per_circle-=1;
						trackless_motor.pulse_num_per_circle=constrain_float(trackless_motor.pulse_num_per_circle,0,50000);
						WriteFlashParameter(PULSE_NPC_CFG,trackless_motor.pulse_num_per_circle,&Trackless_Params);
					}
					break;	
					case 7:
					{
						trackless_motor.servo_median_value1-=1;
						trackless_motor.servo_median_value1=constrain_float(trackless_motor.servo_median_value1,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_1,trackless_motor.servo_median_value1,&Trackless_Params);
					}
					break;
					case 8:
					{
						trackless_motor.servo_median_value2-=1;
						trackless_motor.servo_median_value2=constrain_float(trackless_motor.servo_median_value2,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_2,trackless_motor.servo_median_value2,&Trackless_Params);
					}
					break;	
					case 9:
					{
						rangefinder.sensor_type-=1;
						rangefinder.sensor_type=constrain_float(rangefinder.sensor_type,0,100);
						WriteFlashParameter(RANGEFINDER_TYPE,rangefinder.sensor_type,&Trackless_Params);
					}
					break;	
					case 10:
					{
						if(vbat.enable==1)	vbat.enable=0;
						else vbat.enable=1;
						WriteFlashParameter(NO_VOLTAGE_ENABLE,vbat.enable,&Trackless_Params);
					}
					break;		
					case 11:
					{
						vbat.upper-=0.1f;
						vbat.upper=constrain_float(vbat.upper,0,100);
						WriteFlashParameter(NO_VOLTAGE_UPPER, vbat.upper, &Trackless_Params);	
					}
					break;	
					case 12:
					{
						vbat.lower-=0.1f;
						vbat.lower=constrain_float(vbat.lower,0,100);
						WriteFlashParameter(NO_VOLTAGE_LOWER, vbat.lower, &Trackless_Params);
					}
					break;					
				}
			}
		
			//通过3D按键来实现可以实现选中的参数行自增加调整
			if(_button.state[RT_3D].press==LONG_PRESS)
			{
				_button.state[RT_3D].press=NO_PRESS;
				switch(ver_choose)
				{	
					case 6:
					{
						trackless_motor.pulse_num_per_circle+=100;
						trackless_motor.pulse_num_per_circle=constrain_float(trackless_motor.pulse_num_per_circle,0,50000);
						WriteFlashParameter(PULSE_NPC_CFG,trackless_motor.pulse_num_per_circle,&Trackless_Params);
					}
					break;	
					case 7:
					{
						trackless_motor.servo_median_value1+=50;
						trackless_motor.servo_median_value1=constrain_float(trackless_motor.servo_median_value1,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_1,trackless_motor.servo_median_value1,&Trackless_Params);
					}
					break;
					case 8:
					{
						trackless_motor.servo_median_value2+=50;
						trackless_motor.servo_median_value2=constrain_float(trackless_motor.servo_median_value2,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_2,trackless_motor.servo_median_value2,&Trackless_Params);
					}
					break;							
				}
			}
			
			if(_button.state[LT_3D].press==LONG_PRESS)
			{
				_button.state[LT_3D].press=NO_PRESS;
				switch(ver_choose)
				{	
					case 6:
					{
						trackless_motor.pulse_num_per_circle-=100;
						trackless_motor.pulse_num_per_circle=constrain_float(trackless_motor.pulse_num_per_circle,0,50000);
						WriteFlashParameter(PULSE_NPC_CFG,trackless_motor.pulse_num_per_circle,&Trackless_Params);
					}
					break;	
					case 7:
					{
						trackless_motor.servo_median_value1-=50;
						trackless_motor.servo_median_value1=constrain_float(trackless_motor.servo_median_value1,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_1,trackless_motor.servo_median_value1,&Trackless_Params);
					}
					break;
					case 8:
					{
						trackless_motor.servo_median_value2-=50;
						trackless_motor.servo_median_value2=constrain_float(trackless_motor.servo_median_value2,0,2500);
						WriteFlashParameter(SERVO_MEDIAN_VALUE_2,trackless_motor.servo_median_value2,&Trackless_Params);
					}
					break;					
				}
			}
		}
		break;		
		default:
		{
			LCD_clear_L(0,0);	display_6_8_string(0,0,"basic");									display_6_8_number(110,0,page_number+1);
		}
	}
}


