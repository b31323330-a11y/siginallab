import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface KaTeXViewProps {
  math: string;
  block?: boolean;
}

export const KaTeXView: React.FC<KaTeXViewProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
        });
      } catch (err) {
        if (containerRef.current) {
          containerRef.current.innerText = math;
        }
      }
    }
  }, [math, block]);

  return <span ref={containerRef} className={block ? "block my-2 overflow-x-auto text-center" : "inline"} />;
};

