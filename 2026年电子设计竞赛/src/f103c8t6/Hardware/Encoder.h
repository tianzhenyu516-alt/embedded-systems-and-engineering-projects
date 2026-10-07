#ifndef __ENCODER_H__
#define __ENCODER_H__

typedef struct {
	float reduction_ratio;	//µç»ú¼õËÙ±È
	unsigned int ppr;		//±àÂëÆ÷Âö³å
	float r;				//ÂÖ×Ó°ë¾¶	µ¥Î»£ºm	
}Parameter;

typedef struct {
	Parameter param;
	int Counter_Left;		//×óÂÖÂö³å
	int Counter_Right;		//ÓÒÂÖÂö³å
}Encoder;

void Encoder_Init(Encoder* encoder);
void Get_Encoder(Encoder *encoder);
#endif
