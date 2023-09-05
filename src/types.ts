import React from 'react';

export type StylesInjector = <P extends JSX.IntrinsicAttributes>(
    Component: ComponentType<P>,
    shadowHost: HTMLElement,
    shadowRoot: ShadowRoot,
    mountingInto: HTMLDivElement,
    stylesDiv: HTMLDivElement
) => ComponentType<P> | Promise<ComponentType<P>>;

export type ComponentType<P> = React.ComponentType<P>;
