import { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, RefreshCw, Circle } from 'lucide-react';

export default function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing } })
      .then((stream) => { if (videoRef.current) { videoRef.current.srcObject = stream; setHasPermission(true); } })
      .catch(() => setHasPermission(false));
    return () => { videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop()); };
  }, [facing]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setPhotos([canvas.toDataURL(), ...photos]);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex-1 relative">
        {hasPermission ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <CameraIcon size={48} className="mb-2 opacity-50" />
            <span className="text-sm">Camera preview unavailable</span>
            <span className="text-xs opacity-50">Grant camera permission to use this feature</span>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="h-20 flex items-center justify-between px-8 bg-black">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
          {photos[0] && <img src={photos[0]} className="w-full h-full object-cover" alt="" />}
        </div>
        <button onClick={takePhoto} className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform">
          <Circle size={44} className="text-white" fill="white" />
        </button>
        <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')} className="p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700">
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
}
