import React from 'react';
import { StyleSheetManager, StyleSheetManagerProps } from 'styled-components';
import { ComponentType, StylesInjector } from './types.js';

interface StyledComponentsInjectorOptions {
    disableCSSOMInjection?: boolean;
    disableVendorPrefixes?: boolean;
    stylisPlugins?: StyleSheetManagerProps['stylisPlugins'];
}

export default (options: StyledComponentsInjectorOptions = {}): StylesInjector => {
    // React can't correctly match our ComponentType<T, P> and result of forwardRef an throws error
    // Even if components are same type
    // @ts-ignore
    return <T, P>(
        Component: ComponentType<T, P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
    ) => {
        const { disableCSSOMInjection = false, disableVendorPrefixes = false, stylisPlugins = [] } = options;
        return React.forwardRef((props: P, ref: React.Ref<T>) => {
            return (
                <StyleSheetManager
                    disableCSSOMInjection={disableCSSOMInjection}
                    disableVendorPrefixes={disableVendorPrefixes}
                    stylisPlugins={stylisPlugins}
                    target={mountingInto}
                >
                    <Component {...props} ref={ref} />
                </StyleSheetManager>
            );
        });
    };
};
