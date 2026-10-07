import math
class LINETYPE(object) :
	isNONETYPE	 =0
	isSTRAIGHT	 =1
	isTURNLEFT	 =2
	isTURNRIGHT	=3
	isTJUNCTION	=4
	isCROSSTYPE	=5
class LINETRAKING:
	def __init__(self):
		self.line_xtheta=0
		self.line_xerro=0
		self.line_type=0
		self.last_cx=0
		self.last_cy=0
		self.line_cx=0
		self.line_cy=0
		self.line_cxmean=0
	def trace_visualize_result(self,img,reslut,line_result):
		self.line_cx = 0
		self.line_cy = 0
		if line_result == LINETYPE.isTJUNCTION or line_result == LINETYPE.isCROSSTYPE:
			cnt = 0
			for roi_direct in ['up', 'down']:
				if reslut[roi_direct]['blob_flag']:
					cnt += 1
					self.line_cx += reslut[roi_direct]['cx']
			if cnt == 0:
				self.line_cx = self.last_cx
			else:
				self.line_cx /= cnt
			cnt = 0
			for roi_direct in ['left', 'right']:
				if reslut[roi_direct]['blob_flag']:
					cnt += 1
					self.line_cy += reslut[roi_direct]['cy']
			if cnt == 0:
				self.line_cy = self.last_cy
			else:
				self.line_cy /= cnt
		self.last_cx = self.line_cx
		self.last_cy = self.line_cy
		turn_type = 'N'
		if line_result == LINETYPE.isSTRAIGHT:
			turn_type = 'S'
			mid_x = int(img.width()/2)
			mid_y = int(img.height()/2)
			img.draw_circle(int(self.line_cxmean), mid_y, 5, color=(255))
			img.draw_circle(mid_x, mid_y, 8, color=(0))
			img.draw_line((mid_x, mid_y, int(self.line_cxmean), mid_y), color=(255))
		elif line_result == LINETYPE.isTJUNCTION:
			turn_type = 'T'
			img.draw_cross(int(self.line_cx), int(self.line_cy), size=10, color=(255))
			img.draw_circle(int(self.line_cx), int(self.line_cy), 5, color=(255))
		elif line_result == LINETYPE.isCROSSTYPE:
			turn_type = 'C'
			img.draw_cross(int(self.line_cx), int(self.line_cy), size=10, color=(255))
			img.draw_circle(int(self.line_cx), int(self.line_cy), 5, color=(255))
		elif line_result == LINETYPE.isTURNLEFT:
			turn_type = 'L'
		elif line_result == LINETYPE.isTURNRIGHT:
			turn_type = 'R'
		img.draw_string(0, 0, turn_type,scale=2, color=(0))
	def find_blobs_in_rois(self,img,threshold_blob,threshold_size):
		roi_w=img.width()
		roi_h=int(img.height()/4)
		ROIS = {
			'down': (0, img.height()-roi_h,roi_w, roi_h),
			'middle': (0, int((img.height()-roi_h)/2), roi_w, roi_h),
			'up': (0, 0, roi_w, roi_h),
			'left': (0, int(img.height()/2-roi_h), roi_h, 2*roi_h),
			'right': (img.width()-roi_h, int(img.height()/2-roi_h), roi_h, 2*roi_h)
		}
		roi_blobs_result = {}
		for roi_direct in ROIS.keys():
			roi_blobs_result[roi_direct] = {
				'cx': -1,
				'cy': -1,
				'blob_flag': False
			}
		for roi_direct, roi in ROIS.items():
			blobs=img.find_blobs(threshold_blob, roi=roi, merge=True, pixels_area=100)
			if len(blobs) == 0:
				continue
			largest_blob = max(blobs, key=lambda b: b.pixels())
			if largest_blob.w()>threshold_size[0] or largest_blob.w()<threshold_size[1] or largest_blob.h()>threshold_size[2] or largest_blob.h()<threshold_size[3]:
				continue
			img.draw_rectangle(largest_blob.rect(),color = (255,255,255), thickness = 2, fill = False)
			roi_blobs_result[roi_direct]['cx'] = largest_blob.cx()
			roi_blobs_result[roi_direct]['cy'] = largest_blob.cy()
			roi_blobs_result[roi_direct]['blob_flag'] = True
		return roi_blobs_result
	def find_interserction(self,reslut):
		is_turn_left = False
		is_turn_right = False
		is_straight=  False
		line_result=LINETYPE.isNONETYPE
		if ( reslut['up']['blob_flag'] ) or reslut['down']['blob_flag'] or (reslut['middle']['blob_flag']) :
			is_straight=True
		if (not reslut['up']['blob_flag'] ) and reslut['down']['blob_flag']:
			if reslut['left']['blob_flag']:
				is_turn_left = True
			if reslut['right']['blob_flag']:
				is_turn_right = True
		is_t = False
		is_cross = False
		cnt = 0
		for roi_direct in ['up', 'down', 'left', 'right']:
			if reslut[roi_direct]['blob_flag']:
				cnt += 1
		is_t = cnt == 3
		is_cross = cnt ==4
		if is_t:
			line_result = LINETYPE.isTJUNCTION
		elif is_cross:
			line_result = LINETYPE.isCROSSTYPE
		elif is_turn_left:
			line_result = LINETYPE.isTURNLEFT
		elif is_turn_right:
			line_result = LINETYPE.isTURNRIGHT
		elif is_straight:
			line_result=LINETYPE.isSTRAIGHT
		else :
			line_result=LINETYPE.isNONETYPE
		return line_result
	def find_line_trace(self,img,threshold_blob,threshold_size,is_debug):
		line_result=LINETYPE.isNONETYPE
		reslut = self.find_blobs_in_rois(img,threshold_blob,threshold_size)
		if (not reslut['up']['blob_flag'] ) and (not reslut['down']['blob_flag']) \
			and (not reslut['left']['blob_flag'] ) and (not reslut['right']['blob_flag'] ) :
			return line_result
		line_result=self.find_interserction(reslut)
		min_x,min_y,max_x,max_y=0,0,0,0
		theta_err,rho_err= 0.0,0.0
		if reslut['down']['blob_flag']:
			min_x=reslut['down']['cx']
			min_y=reslut['down']['cy']
		if reslut['up']['blob_flag']:
			max_x=reslut['up']['cx']
			max_y=reslut['up']['cx']
		cx_sum,center_pos= 0,0
		for roi_direct in ['up', 'down', 'middle']:
			if reslut[roi_direct]['blob_flag']:
				cx_sum += reslut[roi_direct]['cx']
			else:
				cx_sum += img.width() / 2
		center_pos=int(cx_sum /3)
		rho_err=center_pos-img.width()/2
		theta_err = math.atan((max_x-min_x)/(abs(max_y-min_y)+1))
		theta_err = math.degrees(theta_err)
		self.line_cxmean=center_pos
		self.line_xtheta=theta_err
		self.line_xerro=rho_err
		self.line_type=line_result
		if is_debug:
			print("minx:%d"%min_x)
			print("miny:%d"%min_y)
			print("maxx:%d"%max_x)
			print("maxy:%d"%max_y)
			print("line_result: %d" %line_result)
			print("rho_err: %f" %rho_err )
			print("theta_err: %f" %theta_err)
			self.trace_visualize_result(img,reslut,line_result)
		return line_result