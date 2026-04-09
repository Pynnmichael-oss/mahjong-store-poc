import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export default function CameraScanner({ onScan, active }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const scannedRef = useRef(false)
  const [cameraError, setCameraError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) {
      cleanup()
      setReady(false)
      return
    }
    scannedRef.current = false
    setCameraError(null)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
            setReady(true)
            tick()
          }
        }
      })
      .catch(() => setCameraError('Camera access denied or unavailable.'))

    return cleanup
  }, [active])

  // Reset scan lock when active toggles back on
  useEffect(() => {
    if (active) scannedRef.current = false
  }, [active])

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function tick() {
    if (scannedRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code?.data) {
        scannedRef.current = true
        onScan(code.data)
        // Resume scanning after 2.5s
        setTimeout(() => { scannedRef.current = false; rafRef.current = requestAnimationFrame(tick) }, 2500)
        return
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  if (!active) return null

  return (
    <div className="relative rounded-xl overflow-hidden bg-navy/10">
      {cameraError ? (
        <div className="p-4 text-center">
          <p className="text-coral text-sm font-sans">{cameraError}</p>
          <p className="text-muted text-xs mt-1 font-sans">Use the Member # tab instead.</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full rounded-xl"
            playsInline
            muted
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/20 rounded-xl">
              <p className="text-navy text-sm font-sans font-semibold">Starting camera…</p>
            </div>
          )}
          {/* Targeting overlay */}
          {ready && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-teal rounded-xl opacity-80" />
            </div>
          )}
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
