#include "change.h"

void int_to_char(__IO int f,__IO char *s)
{
	if(f<0)
	{
    *s='-';
		f=-f;
   }
	 else
	 {
    *s='0';
   }
	 
		*(s+1)=f/1000+'0';         //千位
	  *(s+2)=(f%1000)/100+'0';   //百位
	  *(s+3)=(f%100)/10+'0';     //十位
	  *(s+4)=f%10+'0';           //个位
}
