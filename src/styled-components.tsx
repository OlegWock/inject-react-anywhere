import React from 'react';
import { StyleSheetManager, StyleSheetManagerProps } from 'styled-components';
import { ComponentType, StylesInjector } from './types.js';

interface StyledComponentsInjectorOptions {
    disableCSSOMInjection?: boolean;
    disableVendorPrefixes?: boolean;
    stylisPlugins?: StyleSheetManagerProps['stylisPlugins'];
}

export default (options: StyledComponentsInjectorOptions = {}): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        const { disableCSSOMInjection = false, disableVendorPrefixes = false, stylisPlugins = [] } = options;
        return (props: P) => {
            return (
                <StyleSheetManager
                    disableCSSOMInjection={disableCSSOMInjection}
                    disableVendorPrefixes={disableVendorPrefixes}
                    stylisPlugins={stylisPlugins}
                    // @ts-ignore
                    target={stylesWrapper}
                >
                    <Component {...props} />
                </StyleSheetManager>
            );
        };
    };
};
