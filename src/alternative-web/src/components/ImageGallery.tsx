// @@filename: src/components/ImageGallery.tsx
import React, { useState, useRef, useEffect } from 'react';
import LazyImage from './LazyImage';

interface ImageGalleryProps {
  images: string[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
  }, [currentIndex]);

  return (
    <div className="image-gallery" 
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}>
      <div className="image-gallery-container" ref={containerRef}>
        {images.map((src, index) => (
          <div key={index} className="image-gallery-item">
            <LazyImage src={src} alt={`Property ${index + 1}`} />
          </div>
        ))}
      </div>
      <button className="image-gallery-nav prev" onClick={handlePrev}>{'<'}</button>
      <button className="image-gallery-nav next" onClick={handleNext}>{'>'}</button>
      <div className="image-gallery-indicator">
        {images.map((_, index) => (
          <div 
            key={index} 
            className={`image-gallery-indicator-dot ${index === currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;