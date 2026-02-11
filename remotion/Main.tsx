import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring, Audio, staticFile, Img, Sequence } from 'remotion';

export interface MainProps {
    title: string;
    subHeadline: string;
    slides: string[];
    category?: string;
    backgroundColor?: string;
    backgroundImage: string;
    focusPoint?: 'left' | 'center' | 'right';
    durationInFrames: number;
    hasMusic?: boolean;
}

export const Main: React.FC<MainProps> = ({
    title,
    subHeadline,
    slides = [],
    category = 'NATIONAL',
    backgroundColor = '#000000',
    backgroundImage = 'background.png',
    focusPoint = 'center',
    durationInFrames,
    hasMusic
}) => {
    const { fps, height, width } = useVideoConfig();
    const frame = useCurrentFrame();

    // Background Movement Logic
    const moveType = title.length % 3;

    let scale = 1.1;
    let transX = 0;
    let transY = 0;

    if (moveType === 0) {
        scale = interpolate(frame, [0, durationInFrames], [1.1, 1.4]);
    } else if (moveType === 1) {
        scale = 1.25;
        transX = interpolate(frame, [0, durationInFrames], [-80, 80]); // Reduced drift to keep subject in view
    } else {
        scale = interpolate(frame, [0, durationInFrames], [1.3, 1.1]);
        transX = interpolate(frame, [0, durationInFrames], [80, -80]);
    }

    // Map focusPoint string to CSS objectPosition
    const focusMap = {
        'left': '0%',
        'center': '50%',
        'right': '100%'
    };

    // Safe Zones
    const safeZoneBottom = 280;
    const safeZoneTop = 150;

    // Slide Logic (6 seconds per slide)
    const framesPerSlide = fps * 6;
    const currentSlideIndex = Math.min(
        Math.floor(frame / framesPerSlide),
        slides.length - 1
    );
    const currentSlideText = slides[currentSlideIndex];

    // Slide Animation (Drop into place)
    const slideFrame = frame % framesPerSlide;
    const slideEntry = spring({
        frame: slideFrame,
        fps,
        config: { stiffness: 100, damping: 15 }
    });

    const slideExit = interpolate(
        slideFrame,
        [framesPerSlide - 10, framesPerSlide],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const slideY = interpolate(slideEntry, [0, 1], [-100, 0]);
    const slideScale = interpolate(slideEntry, [0, 1], [0.8, 1]);
    const slideOpacity = slideEntry * slideExit;

    // Ending Sequence Reveal
    const isEnding = frame > durationInFrames - (fps * 2.5);
    const opacityEnding = spring({
        frame: frame - (durationInFrames - fps * 2.5),
        fps,
        config: { damping: 20 }
    });

    return (
        <AbsoluteFill style={{ backgroundColor, color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {hasMusic && (
                <Audio
                    src={staticFile('music.mp3')}
                    volume={isEnding ? 0.5 : 0.3}
                />
            )}

            {/* Background Layer (SMART FOCUS ENABLED) */}
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                <Img
                    src={staticFile(backgroundImage)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${focusMap[focusPoint]} 50%`,
                        filter: 'brightness(0.35) saturate(1.2) blur(1px)',
                        transform: `scale(${scale}) translate(${transX}px, ${transY}px)`
                    }}
                />

                {/* Newsroom Tint Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4) 0%, rgba(239, 68, 68, 0.1) 100%)',
                    pointerEvents: 'none'
                }} />
            </AbsoluteFill>

            {/* Pro Header Section */}
            {!isEnding && (
                <div style={{
                    position: 'absolute',
                    top: safeZoneTop,
                    left: 55,
                    right: 55,
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                        <div style={{
                            backgroundColor: '#ef4444',
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: 2
                        }}>
                            BREAKING
                        </div>
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            padding: '10px 25px',
                            fontSize: 34,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            border: '1px solid #ef4444'
                        }}>
                            {category}
                        </div>
                    </div>

                    <h1 style={{
                        fontSize: 64,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        lineHeight: 0.95,
                        margin: 0,
                        textShadow: '0 6px 30px rgba(0,0,0,1)',
                        color: '#fff',
                        borderLeft: '18px solid #ef4444',
                        paddingLeft: 30
                    }}>
                        {title}
                    </h1>

                    <div style={{
                        fontSize: 38,
                        fontWeight: 700,
                        marginTop: 20,
                        color: '#fff',
                        lineHeight: 1.1,
                        textShadow: '0 2px 10px rgba(0,0,0,1)',
                        maxWidth: '92%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        padding: '5px 15px',
                        display: 'inline-block'
                    }}>
                        {subHeadline}
                    </div>
                </div>
            )}

            {/* Full Block Content Slides (The part the user liked) */}
            {!isEnding && (
                <AbsoluteFill style={{
                    justifyContent: 'center',
                    opacity: slideOpacity,
                    transform: `translateY(${slideY}px) scale(${slideScale})`
                }}>
                    <div style={{
                        width: '100%',
                        padding: '0 50px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            fontSize: 58,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            color: '#fff',
                            textAlign: 'center',
                            lineHeight: 1.05,
                            textShadow: '0 15px 50px rgba(0,0,0,1)',
                            backgroundColor: 'rgba(190, 18, 18, 0.98)',
                            padding: '40px 50px',
                            width: '100%',
                            borderRadius: 2,
                            boxShadow: '0 15px 60px rgba(0,0,0,0.7)',
                            borderBottom: '12px solid #991b1b'
                        }}>
                            {currentSlideText}
                        </div>
                    </div>
                </AbsoluteFill>
            )}

            {/* Footer Branding */}
            {!isEnding && (
                <div style={{
                    position: 'absolute',
                    bottom: safeZoneBottom,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 15,
                    zIndex: 5
                }}>
                    <Img src={staticFile('logo.png')} style={{ height: 180 }} />
                    <div style={{
                        fontSize: 42,
                        fontWeight: 900,
                        letterSpacing: 6,
                        color: '#fff',
                        textShadow: '0 4px 15px rgba(0,0,0,0.8)'
                    }}>
                        @THEVITALVIRAL
                    </div>
                </div>
            )}

            {/* Outro */}
            {isEnding && (
                <AbsoluteFill style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#000',
                    opacity: opacityEnding
                }}>
                    <Img
                        src={staticFile('logo.png')}
                        style={{
                            height: 560,
                            transform: `scale(${interpolate(opacityEnding, [0, 1], [0.8, 1])})`
                        }}
                    />
                    <div style={{
                        marginTop: 60,
                        fontSize: 85,
                        fontWeight: 900,
                        letterSpacing: 10
                    }}>
                        @THEVITALVIRAL
                    </div>
                    <div style={{
                        fontSize: 40,
                        color: '#ef4444',
                        fontWeight: 800,
                        marginTop: 25,
                        letterSpacing: 4
                    }}>
                        FOLLOW FOR MORE VIRAL CONTENT
                    </div>
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
