import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="NewsVideo"
                component={Main}
                durationInFrames={1800} // Default 60s
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    title: 'VIRAL NEWS UPDATE',
                    subHeadline: 'A major development is occurring in the United States involving national security.',
                    slides: [
                        'Slide 1: Breaking news reported this morning.',
                        'Slide 2: Officials are currently investigating the scene.',
                        'Slide 3: Impact is expected to be significant.'
                    ],
                    backgroundColor: '#0f172a',
                    backgroundImage: 'background.png',
                    durationInFrames: 1800,
                    category: 'NATIONAL'
                }}
                calculateMetadata={({ props }) => {
                    return {
                        durationInFrames: (props as any).durationInFrames || 1800
                    };
                }}
            />
        </>
    );
};
