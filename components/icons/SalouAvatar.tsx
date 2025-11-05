import React from 'react';

const avatarStyles = `
@keyframes salou-blink {
    0%, 48%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.1); }
}
.salou-eye {
    transform-origin: center;
    animation: salou-blink 5s infinite;
}
@keyframes salou-antenna-glow {
    0%, 100% { fill: #F5A623; }
    50% { fill: #F8D079; }
}
.salou-antenna-light-talking {
    animation: salou-antenna-glow 1.5s infinite;
}
`;

export const SalouAvatar = ({ isTalking }: { isTalking: boolean }) => (
    <>
        <style>{avatarStyles}</style>
        <svg width="200" height="200" viewBox="0 0 100 100" className="drop-shadow-lg">
            <defs>
                <radialGradient id="salou-head-gradient" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#5E9BEF" />
                    <stop offset="100%" stopColor="#4A90E2" />
                </radialGradient>
            </defs>
            {/* Antenna */}
            <line x1="50" y1="12" x2="50" y2="20" stroke="#357ABD" strokeWidth="2" strokeLinecap="round" />
            <circle 
                cx="50" 
                cy="10" 
                r="4" 
                fill={isTalking ? "#F5A623" : "#B0C4DE"} 
                stroke="#357ABD" 
                strokeWidth="1.5"
                className={isTalking ? 'salou-antenna-light-talking' : ''}
            />

            {/* Head */}
            <path d="M20 30 Q50 10 80 30 V70 Q50 90 20 70 Z" fill="url(#salou-head-gradient)" stroke="#357ABD" strokeWidth="2.5" />
            
            {/* Faceplate */}
            <path d="M25 32 Q50 20 75 32 V65 Q50 75 25 65 Z" fill="#E8F0FE" />
            
            {/* Eyes */}
            <g>
                <circle cx="40" cy="45" r="5" fill="#333" className="salou-eye" />
                <circle cx="40" cy="43" r="1.5" fill="#FFF" opacity="0.7" />
            </g>
            <g>
                <circle cx="60" cy="45" r="5" fill="#333" className="salou-eye" style={{ animationDelay: '0.15s' }}/>
                <circle cx="60" cy="43" r="1.5" fill="#FFF" opacity="0.7" />
            </g>
            
            {/* Mouth */}
            {isTalking ? (
                // Open mouth for talking
                <path d="M45 62 C 47 68, 53 68, 55 62" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
                // Closed mouth
                <line x1="45" y1="62" x2="55" y2="62" stroke="#333" strokeWidth="2" strokeLinecap="round" />
            )}
        </svg>
    </>
);