import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '100px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : ''}
      alt={alt}
      style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
};

export default LazyImage;
