import React from 'react';
import createCache, { Options } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ComponentType, StylesInjector } from './types.js';

interface EmotionInjectorOptions {
    stylisPlugins?: Options['stylisPlugins'];
}

export default (options: EmotionInjectorOptions = {}): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes,>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement,
    ) => {
        const { stylisPlugins = [] } = options;
        // Some fluck with types. TS thinks createCache isn't callable
        // @ts-ignore
        const cache = createCache({
            key: Math.random()
                .toString(36)
                .replace(/[^a-z]+/g, '')
                .slice(0, 5),
            stylisPlugins: stylisPlugins,
            container: stylesWrapper,
        });
        return (props: P) => {
            return (
                <CacheProvider value={cache}>
                    <Component {...props} />
                </CacheProvider>
            );
        };
    };
};
