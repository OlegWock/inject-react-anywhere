import React from 'react';

export type StylesInjector = <P>(
    Component: ComponentType<P>,
    shadowHost: HTMLDivElement,
    shadowRoot: ShadowRoot,
    mountingInto: HTMLDivElement
) => ComponentType<P>;


export type ComponentType<P> = React.ComponentType<P>;
