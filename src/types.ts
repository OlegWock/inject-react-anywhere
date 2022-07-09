import React from 'react';

export interface Constructor<T> {
    new (...args: any[]): T;
    name: string;
}

export type ReactFunctionComponent<P> = (props: P) => JSX.Element;

export type StylesInjector = <T, P>(
    Component: ComponentType<T, P>,
    shadowHost: HTMLDivElement,
    shadowRoot: ShadowRoot,
    mountingInto: HTMLDivElement
) => ComponentType<T, P>;

export type ExtractRefType<P> = P extends { ref: React.Ref<infer T> } ? T : never;

// Which cases should we support:
// Built in components --> attach ref to root
// Function components with forwardRef
export type ComponentType<T, P> = React.ComponentType<P & React.RefAttributes<T>>;
