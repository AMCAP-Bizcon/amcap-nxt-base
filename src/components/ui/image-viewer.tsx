'use client'

import * as React from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface ImageViewerProps {
  images: { url: string }[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewer({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)
  const [scale, setScale] = React.useState(1)
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex)
      setScale(1)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, initialIndex])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onOpenChange(false)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, currentIndex, images.length])

  const goNext = React.useCallback(() => {
    if (images.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setScale(1)
  }, [images.length])

  const goPrev = React.useCallback(() => {
    if (images.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setScale(1)
  }, [images.length])

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.5))
  
  const resetZoom = () => setScale(1)

  if (!open || !isClient || images.length === 0) return null

  const currentImage = images[currentIndex]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Top action bar */}
      <div className="absolute top-0 right-0 left-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white/80 font-medium text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={zoomOut}
            className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button 
            onClick={resetZoom}
            className="text-white/70 hover:text-white transition-colors text-sm font-medium px-2 py-1 hover:bg-white/10 rounded"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button 
            onClick={zoomIn}
            className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/20 mx-1" />
          <button 
            onClick={() => onOpenChange(false)}
            className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full transition-all group"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full transition-all group"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Image Container */}
      <div 
        className="w-full h-full flex items-center justify-center overflow-auto p-4 md:p-12"
      >
        <img
          src={currentImage.url}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
          style={{ transform: `scale(${scale})` }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    document.body
  )
}
