import React from "react";
import { motion } from "framer-motion";

export const CascadeTextHover = ({ text, className }) => {
  return (
    <motion.span
      initial="initial"
      whileHover="hover"
      className={`relative overflow-hidden inline-block ${className || ""}`}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            variants={{
              initial: { y: 0 },
              hover: { y: "-100%" },
            }}
            transition={{
              duration: 0.25,
              ease: "easeInOut",
              delay: index * 0.02,
            }}
            className="inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>
      <span aria-hidden className="absolute inset-0 inline-flex">
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            variants={{
              initial: { y: "100%" },
              hover: { y: 0 },
            }}
            transition={{
              duration: 0.25,
              ease: "easeInOut",
              delay: index * 0.02,
            }}
            className="inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>
    </motion.span>
  );
};
