import React, { useContext } from "react";
import { Context } from "./context.js";

// Reference https://react-typescript-cheatsheet.netlify.app/docs/hoc/intro/

export interface ShadowDomProps {
    insideShadowDom: boolean;
    shadowHost: HTMLDivElement | null;
    shadowRoot: ShadowRoot | null;
    mountedInto: HTMLDivElement | null;
    unmountRoot: () => void | null;
}

export const withShadowDom = <P extends ShadowDomProps>(
    WrappedComponent: React.ComponentType<P>,
) => {

    const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";
    const ComponentWithShadowDom = (props: Omit<P, keyof ShadowDomProps>) => {
        const contextProps = useContext(Context);
        return <WrappedComponent {...contextProps} {...(props as P)} />;
    };

    ComponentWithShadowDom.displayName = `withShadowDom(${displayName})`;
    return ComponentWithShadowDom;
}