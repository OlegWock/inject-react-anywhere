import React from 'react';
import createCache, { Options } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ComponentType, StylesInjector } from './types.js';

interface EmotionInjectorOptions {
    stylisPlugins?: Options['stylisPlugins'];
}

export default (options: EmotionInjectorOptions = {}): StylesInjector => {
    // React can't correctly match our ComponentType<T, P> and result of forwardRef an throws error
    // Even if components are same type
    // @ts-ignore
    return <T, P>(
        Component: ComponentType<T, P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
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
            container: mountingInto,
        });
        return React.forwardRef((props: P, ref: React.Ref<T>) => {
            return (
                <CacheProvider value={cache}>
                    <Component {...props} ref={ref} />
                </CacheProvider>
            );
        });
    };
};
