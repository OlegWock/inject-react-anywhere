import React from 'react';
import { createRoot } from 'react-dom/client';
import { RenderResult } from './inject.js';
import { ComponentType } from './types.js';

export default async <P,>(
    Component: ComponentType<P>,
    props: P,
    mountInto: HTMLDivElement
): Promise<RenderResult<P>> => {
    let propsSaved = { ...props };
    return new Promise((resolve) => {
        const root = createRoot(mountInto);
        // @ts-ignore
        root.render(<Component {...props} />);
        const result: RenderResult<P> = {
            updateProps: (newProps) => {
                return new Promise((resolve) => {
                    propsSaved = { ...propsSaved, ...newProps };
                    // @ts-ignore
                    root.render(<Component {...propsSaved} />);
                    resolve();
                });
            },
            unmount: () => {
                return new Promise((resolve) => {
                    root.unmount();
                    resolve();
                });
            },
        };
        resolve(result);
    });
};
