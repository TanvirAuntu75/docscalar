import React from 'react';

const SignatureIcon = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* The Pencil */}
    <path d="M18.4 5.6a2.1 2.1 0 0 0-3 0L6.9 14.1 6 18l3.9-.9 8.5-8.5a2.1 2.1 0 0 0 0-3Z" />
    {/* The Eraser Line */}
    <path d="M14 7.5l2.5 2.5" />
    {/* The Wavy Signature Line */}
    <path d="M5 20.5c1.5 0 2.5-1 4-1s2 1.5 3.5 1.5 2-2 3.5-2 2 1 4 1" />
  </svg>
);

export default SignatureIcon;
