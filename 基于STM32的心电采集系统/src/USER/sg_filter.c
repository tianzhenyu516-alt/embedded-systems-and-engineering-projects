#include "sg_filter.h"
#include "Matrix_operation.h"
#include "math.h"


void filter_data(__IO float B[])    //得到滤波矩阵 
{
 int m,i,j;
 float s[N][D+1]={0};              //矩阵s
 float s_tran[D+1][N]={0};         //s的转置矩阵
 float F[4][4]={0};
 float b1[N][4]={0};
 float b2[N][N]={0};

 for(m=-M;m<=M;m++)             //得到矩阵s
 {
    for(i=0;i<=D;i++)
	{
	  s[m+M][i]=pow(m,i);   
	}
 }                          
  
 Matrix_trans(11,4,&s[0][0],&s_tran[0][0]);             //s的转置矩阵
 Matrix_mul(s_tran[0],s[0],D+1,N,D+1,F[0]);             //得到F矩阵
 Matrix_inverse(F[0], D+1);                              //得到F的逆矩阵
 Matrix_mul(s[0],F[0],N,D+1,D+1,b1[0]);       //得到F矩阵



 Matrix_mul(&b1[0][0],&s_tran[0][0],N,D+1,N,&b2[0][0]);  //得到F矩阵
 for(i=0;i<N;i++)
 {
   for(j=0;j<N;j++)
   {
     B[i*N+j]=b2[i][j];
   }
 }  
}
