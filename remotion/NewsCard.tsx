import { AbsoluteFill, Img, staticFile } from 'remotion';
import React from 'react';
import { z } from 'zod';

export const NewsCardSchema = z.object({
    category: z.string(),
    headline: z.string(),
    subHeadline: z.string(),
    backgroundImage: z.string(),
    source: z.string().optional(),
});

// ─── News Card Component ──────────────────────────────────────────────────
export const NewsCard: React.FC<z.infer<typeof NewsCardSchema>> = ({
    category,
    headline,
    subHeadline,
    backgroundImage,
    source = 'TVV News',
}) => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000000' }}>

            {/* TOP 42%: BLACK AREA */}
            <div style={{
                position: 'absolute',
                top: '-1px', // Slight overlap to prevent top border line
                left: '-1px', // Slight overlap to prevent left border line
                right: '-1px',
                height: '42.5%',
                backgroundColor: 'black',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 70px',
                zIndex: 10
            }}>
                {/* Red Label */}
                <div style={{ marginBottom: '10px' }}>
                    <span style={{
                        color: '#ff0000',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: '32px',
                        fontWeight: '1000',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {category === 'NEWS' || !category ? 'BREAKING NEWS' : category}
                    </span>
                </div>

                {/* Headline: Serif White */}
                <h1 style={{
                    color: 'white',
                    fontFamily: 'Georgia, serif',
                    fontSize: '82px',
                    fontWeight: '900',
                    lineHeight: '1.05',
                    margin: '0 0 15px 0',
                    letterSpacing: '-2px'
                }}>
                    {headline}
                </h1>

                {/* Subheadline: Serif White */}
                <h2 style={{
                    color: 'white',
                    fontFamily: 'Georgia, serif',
                    fontSize: '38px',
                    fontWeight: '400',
                    lineHeight: '1.3',
                    margin: 0,
                    opacity: 0.95
                }}>
                    {subHeadline}
                </h2>

                {/* Source Line Item */}
                <div style={{
                    position: 'absolute',
                    bottom: '25px',
                    right: '70px',
                }}>
                    <span style={{
                        color: 'white',
                        fontFamily: 'Georgia, serif',
                        fontSize: '26px',
                        fontStyle: 'italic',
                        opacity: 0.7
                    }}>
                        Source: {source}
                    </span>
                </div>
            </div>

            {/* BOTTOM 58%: IMAGE AREA */}
            <div style={{
                position: 'absolute',
                top: '42%',
                left: '-1px',
                right: '-1px',
                bottom: '-1px',
                overflow: 'hidden',
                backgroundColor: '#1a1a1a', // Dark slate fallback
                backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)', // Premium gradient fallback
            }}>
                <Img
                    src={staticFile(backgroundImage || 'background.png')}
                    style={{
                        width: 'calc(100% + 2px)',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            </div>

            {/* Overlaying the user provided logo at the absolute bottom center */}
            {/* Pushing it down even harder to hit the edge */}
            <div style={{
                position: 'absolute',
                bottom: '-200px',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 100,
            }}>
                <Img
                    src={staticFile('logo4photo.png')}
                    style={{
                        width: '560px',
                        height: 'auto',
                        filter: 'drop-shadow(0 5px 20px rgba(0,0,0,1))'
                    }}
                />
            </div>

        </AbsoluteFill>
    );
};
