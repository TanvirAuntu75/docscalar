import React from 'react';
import { motion } from 'framer-motion';

export default function Skeleton({ className = '', variant = 'rectangular' }) {
  const baseClasses = "relative overflow-hidden bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-md border border-black/[0.05] dark:border-white/[0.05]";

  let variantClasses = "";
  if (variant === 'circular') {
    variantClasses = "rounded-full";
  } else if (variant === 'text') {
    variantClasses = "rounded-md";
  } else {
    variantClasses = "rounded-2xl";
  }

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`}>
      <motion.div
        className="absolute top-0 left-0 right-0 bottom-0 z-10"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 1.5
        }}
      >
        <div className="w-[150%] h-full bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent" />
      </motion.div>
    </div>
  );
}
