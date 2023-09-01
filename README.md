# inject-react-anywhere

[![npm version][npmv-image]][npmv-url]
[![npm downloads][npmd-image]][npmd-url]

> Now you can inject your React components anywhere. Even in 3rd party site's DOM. Without parent styles bleeding inside, without hustle and without iframe.


## Features

* Setups Shadow DOM wrapper for react components for you.
* Handles injection of styles for you. Yes, CSS-in-JS too (currently supported `styled-components` and `emotion`).
* Exposes nice API to access additional info about how/where component is mounted.
* First-class TypeScript.

## Gathering feedback

I invite you to share your thoughts about this library. If you have some ideas or feature requests, please head to [discussion](https://github.com/OlegWock/inject-react-anywhere/discussions/1). It's right place to ask for new style injectors for example.

If you have bugs to report — create an [issue](https://github.com/OlegWock/inject-react-anywhere/issues). And if you ready to code some features yourself — feel free to make pull request (but please create issue with description of intended changes so we can discuss optimal way to implement it).

## Breaking changes in 3.x.x

* Breaking change in types. Also added option to attach shadow root to provided node (`shadowHost`).

## Breaking changes in 2.x.x

* Style injectors now should accept one extra parameter `stylesWrapper` (div element) and if possible inject styles into this node. Built-in style injectors were updated to support this. This change required to support mirroring of styles and portalling part of component into different shadow dom. While you should be able to upgrade without any changes, this is considered breaking change thus bump to 2.0.0.

## Motivation

I mainly develop browser extensions. And I find React very useful when it comes to building UI more complex than three inputs and two buttons. And sometimes (a lot of times actually) you need to inject that component into 3rd party site, which you don't control. I spent enough time debugging cases when styles from parent were affecting my widget. 

Shadow DOM helps a lot, but you still need to fine tune it for your needs. Inject css reset here, write function to hide all implementation details there and so on. This quickly grows to the size of small library. Why reinvent the wheel?

Now you can save yourself a couple of hours (or even days) and just use this library.

### Why not iframe?

To isolate your component from parent site you can use iframe. You embed component in the iframe and then embed iframe on page. Styles are isolated out of the box. But it has its own downsides too:

1. Iframe is isolated from parent. It's his strengths and it's his weakness too. Wanted to access URL of parent page? Too bad! You need to proxy that through another script.

2. Iframes might not be allowed on page (hello `frame-src` CSP directive).

3. Iframe requires you to build rectangular components. Wanted to build small button which shows dropdown on click? Oops, try Shadow DOM next time.

## Install

```bash
yarn add inject-react-anywhere

# Or if you're npm enjoyer
npm install inject-react-anywhere
```

## Tutorial

First of all, we need a components which we'll inject. Both function and class components will do. For styling, currently supported (out of the box) solutions are supplying your css as array of string, `styled-components` and `emotion`. If this doesn't cover your need, please head to API reference and I'll show how you can write your own adapter. For now, let's assume we have this component written with styled-components:

```jsx
import React from 'react';
import styled from "styled-components";

const StyledPopup = styled.div`
    position: fixed;
    top: 200px;
    left: 200px;
    padding: 48px;
    font-size: 22px;
    color: white;
    z-index: 9999999999999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 400px;
    height: 300px;
    background: #fcd4db;
    box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
`;

const Greeter = ({name}) => {
    return (<StyledPopup>
        Hello, {name}! How are you?
    </StyledPopup>)
};
```

Pretty minimal component. Now we need to make it injectable. To do so, we need to wrap our component with `createInjectableComponent` function. It accepts component you're going to inject and styles component depends on.

```js
// Add these imports to start of file
import { createInjectableComponent } from "inject-react-anywhere";
import styledComponents from 'inject-react-anywhere/styled-components';

export const InjectableGreeter = createInjectableComponent(Greeter, {
    styles: styledComponents()
});
```

As you can see, `styledComponents` functions is imported from separate file. Same story with `emotion`, import it from `inject-react-anywhere/emotion`. And in case you want to use CSS strings just supply an array of strings to `styles` field. How do you load your external CSS files as raw strings depends on your tooling.

```js
export const InjectableGreeter = createInjectableComponent(Greeter, {
    styles: ['.my-class { font-size: 22px; }', '<some CSS from 3rd party lib you use>']
});
```

If you need to combine a few style injectors (e.g. one of components libraries you use depends on `emotion`, but you use css strings), you can use `combineStyleInjectors` function:

```js
import { createInjectableComponent, combineStyleInjectors, stringStyles } from "inject-react-anywhere";
import styledComponents from 'inject-react-anywhere/styled-components';

export const InjectableGreeter = createInjectableComponent(Greeter, {
    styles: combineStyleInjectors(
        stringStyles(['.my-class { font-size: 22px; }', '<some CSS from 3rd party lib you use>']),
        styledComponents()
    ),
});
```

Calling `createInjectableComponent` doesn't do much. It just packs your component with some metadata (styles). To render your component you need to actually call `injectComponent` function. If we're talking about browser extensions (and I tbh can't imagine other usecases for this library. If you do – let me know please!!) this code will go to content script which is run on some 3rd party site. 

```js
import React from 'react';
import { InjectableGreeter } from './InjectableGreeter';
import { injectComponent } from 'inject-react-anywhere';

const main = async () => {
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
    });

    document.body.append(controller.shadowHost);
};

main();
```

You provide `injectComponent` with component's wrapper (from previous step) and initial props and it will return an object with fields (among other) `shadowHost`, `updateProps` and `unmount` which can be used to embed component in DOM, update it and unmount. And that's it. You finished minimal tutorial.

## Examples or how do I...

### ...get info about shadow host in component itself?

There are two ways to do this: hooks for functional components and HOC for class components. Hook can be used like this (directly in mounted component or in any of its children):

```jsx
import React from 'react';
import { useShadowDom } from "inject-react-anywhere";

const Greeter = ({name}) => {
    const { insideShadowDom, unmountRoot, shadowRoot, shadowHost, mountedInto } = useShadowDom();

    // Please keep in mind that your components might be rendered not in Shadow DOM, but in normal DOM nodes too.
    // So don't forget to check that `insideShadowDom` is true before accessing other properties

    return (<StyledPopup>
        Hello, {name}! How are you?

        {insideShadowDom && <div>Wow, I'm rendered in ShadowDOM!</div>}
    </StyledPopup>)
};
```

And for class components you wrap them in `withShadowDom` HOC. This same functions and variables you get when calling `useShadowDom` hook will be passed as props to your component. This too can be used on both root component and any of its children.

```jsx
import React from 'react';
import { withShadowDom } from "inject-react-anywhere";

class Greeter extends React.Component {
    // But don't forget to check if component is indeed rendered in ShadowDOM
    render() {
        return (<StyledPopup>
            Hello, {name}! How are you?

            {this.props.insideShadowDom && <div>Wow, I'm rendered in ShadowDOM!</div>}
        </StyledPopup>);
    }
}

export default withShadowDom(Greeter);
```

If you're using TypeScript, don't forget to include these fields in your prop type:

```tsx
import React from 'react';
import { withShadowDom, ShadowDomProps } from "inject-react-anywhere";

interface GreeterProps extends ShadowDomProps {
    name: string;
}

class Greeter extends React.Component<GreeterProps, {}> {
    // But don't forget to check if component is indeed rendered in ShadowDOM
    render() {
        return (<StyledPopup>
            Hello, {name}! How are you?

            {this.props.insideShadowDom && <div>Wow, I'm rendered in ShadowDOM!</div>}
        </StyledPopup>);
    }
}

export default withShadowDom(Greeter);
```

### ...update props

When you call `injectComponent` it will return you object with field (among other) `updateProps`. You can call it with partial (or full) properties object and component will be re-rendered with new props.

```jsx
import React from 'react';
import { InjectableGreeter } from './InjectableGreeter';
import { injectComponent } from 'inject-react-anywhere';

const main = async () => {
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
    });

    document.body.append(controller.shadowHost);

    setTimeout(() => {
        controller.updateProps({name: 'Miguel'});
    }, 3000);
};

main();
```

### ...properly unmount component

You can alway just remove shadow host which will remove component from page. But chances are high you'll still have some timers (started by components) active or something like this. To properly unmount component use `unmount` function returned by `injectComponent`.

```jsx
import React from 'react';
import { InjectableGreeter } from './InjectableGreeter';
import { injectComponent } from 'inject-react-anywhere';

const main = async () => {
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
    });

    document.body.append(controller.shadowHost);

    setTimeout(() => {
        // Bye bye
        controller.unmount();
    }, 3000);
};

main();
```

### ...invoke imperative methods of component / get access to DOM nodes of component

`inject-react-anywhere` doesn't automatically pass ref to component, but you can do this yourself!

```jsx
import React from 'react';
import { createInjectableComponent, injectComponent } from "inject-react-anywhere";
import styledComponents from 'inject-react-anywhere/styled-components';

const Greeter = ({name, rootRef}) => {
    const [showSecret, setShowSecret] = useState(false);

    useImperativeHandle(rootRef, () => {
        return {
            displaySecret: () => {
                setShowSecret(true);
            },
        };
    });


    return (<StyledPopup>
        Hello, {name}! How are you?

        {showSecret && <div>This isn't really secret...</div>}
    </StyledPopup>)
};

const InjectableGreeter = createInjectableComponent(Greeter, {
    styles: styledComponents()
});

const main = async () => {
    const ref = React.createRef();
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
        rootRef: ref
    });

    document.body.append(controller.shadowHost);

    setTimeout(() => {
        if (ref.current) ref.current.displaySecret();
    }, 5000);
};

main();
```

### ...use this lib with React 18

If you use this lib with React 18 you might noticed this annoying error in console: 'ReactDOM.render is no longer supported in React 18. Use createRoot instead...' blah blah blah. To switch to new rendering API you can use `mountStrategy` option of `injectComponent` function.


```jsx
import React from 'react';
import { InjectableGreeter } from './InjectableGreeter';
import { injectComponent } from 'inject-react-anywhere';
import v18 from 'inject-react-anywhere/v18';

const main = async () => {
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
    }, {
        mountStrategy: v18
    });

    document.body.append(controller.shadowHost);

    setTimeout(() => {
        controller.updateProps({name: 'Miguel'});
    }, 3000);
};

main();
```

### ...limit access of host site to my component

You can try `useClosedShadow` option of `injectComponent`. This won't allow scripts from host to access inside your Shadow DOM, where your component is mounted.

```js
const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
    }, {
        useClosedShadow: trur
    });
```

### ...wrap my component in providers

Just create wrapper component and pass it to `createInjectableComponent`.

```js
import React from 'react';
import { createInjectableComponent } from "inject-react-anywhere";
import styledComponents from 'inject-react-anywhere/styled-components';


const Greeter = ({name}) => {
    return (<StyledPopup>
        Hello, {name}! How are you?
    </StyledPopup>)
};

export const InjectableGreeter = createInjectableComponent((props) => {
        return (
            <SomeProvider providerProp="whatever">
                <Greeter {...props}/>
            </SomeProvider>
        );
    }, {
    styles: styledComponents()
});
```

### ...use portals

Just as you do normally. `ReactDOM.createPortal` goes brrrrrr. Additionally, you can use `createShadowPortal` function to create element for portalling into. This function just creates a node and attaches shadow DOM with two div nodes (one for portalling into it and second one for styles). However, it plays nicely with `mirrorStylesInto` returned by `injectComponent`. This function accepts DOM element and mirrors any changes to `stylesWrapper` element of original component to provided element. This way you can portals without issues with styles.

```js
import React from 'react';
import { InjectableGreeter } from './InjectableGreeter';
import { injectComponent, createShadowPortal } from 'inject-react-anywhere';

const main = async () => {
    const portalController = createShadowPortal();
    const controller = await injectComponent(InjectableGreeter, {
        name: 'Oleh',
        portalInto: portalController.portalInto
    });
    controller.mirrorStylesInto(portalController.stylesWrapper);

    document.body.append(portalController.shadowHost);
    document.body.append(controller.shadowHost);
};

main();
```

This is particularly useful if you embed your widget in small component and need to work around stacking context to display part of your component to go over parent boundaries. Just create portal and append its `shadowHost` to end of body.

## API reference

### createInjectableComponent

Signature: 

```ts
const createInjectableComponent = <P>(component: ComponentType<P>, options: CreateInjectableComponentOptions): InjectableComponent<P>
```

This function accepts component to wrap and options. Options currently consist of just two fields: `name` (will be populated automatically) and `styles`. Styles can be either `null` (no styles at all), array of css strings or `StylesInjector`. `StylesInjector` is a function which accepts component and parameters, injects styles (preferably into `stylesWrapper`) and returns new component. 

```ts
type StylesInjector = <P>(Component: ComponentType<P>, shadowHost: HTMLElement, shadowRoot: ShadowRoot, mountingInto: HTMLDivElement, stylesWrapper: HTMLDivElement) => ComponentType<P>;
```

By implementing your own style injector you can add support for other styling solutions. For reference please check [`emotion.tsx`](src/emotion.tsx) or [`styled-components.tsx`](src/styled-components.tsx), they both are implementations of `StylesInjector`.

`createInjectableComponent` returns plain object with provided component and metadata. You most likely don't want to mofidy or use it directly, just pass them to `injectComponent` function.

### injectComponent

SIgnature:

```ts
const injectComponent = async <P>(injectable: InjectableComponent<P>, props: P, options: InjectOptions<P> = {}): Promise<InjectionResult<P>>
```

This function accepts `injectable` which was returned from `createInjectableComponent` function, props and optional options (sorry!). Options consist of `includeCssReset` (boolean, `true` by default) which controls should library include CSS reset into shadow dom. In most cases you want to get rid of any impact of parent site's styles on your component, but sometimes disabling this might be useful too. Another option is `shadowHost` which allows you to provide element to attach shadow root to. And the last option is `mountStrategy`. This is function which mounts component into DOM node and returns `updateProps` and `unmount` function. This mostly needed to support React v18 rendering. If ommited -- standart `ReactDOM.render` will be used. You probably don't need to provide your own function here.

```ts
import { injectComponent } from 'inject-react-anywhere';
import v18 from 'inject-react-anywhere/v18';

const controller = await injectComponent(InjectableGreeter, {
    name: 'Oleh',
}, {
    mountStrategy: v18
});

document.body.append(controller.shadowHost);
```

Function returns promise, which resolves to object with these properties:

```ts
// P here is component's props type
interface InjectionResult<P> {
    id: string; // Unique ID per each mount
    shadowHost: HTMLDivElement; // DOM element where ShadowDOM is attached. Append this to parent's site
    shadowRoot: ShadowRoot; // Shadow Root attachet to shadowHost. Inject your styles here
    mountedInto: HTMLDivElement; // Div inside shadowRoot where component is rendered. Content of this div will be controlled by React
    updateProps: (newProps: Partial<P>) => Promise<void>; // Updated props and re-renders component
    unmount: () => Promise<void>; // Unmounts component
}
```

### useShadowDom / withShadowDom

This hook and HOC exposes info about Shadow DOM to rendered components. This can be used anywhere in the component tree. You can also safely use (as long as you check for `insideShadowDom`) components that uses this API inside normal React components rendered to normal DOM. 

Both hook and HOC exposes same fields and functions. Hook returns them as object and HOC passes them as props to wrapped component. These fields are:

```ts
insideShadowDom: boolean; // If this is true -- all other won't be null too, you don't need to check ALL fields for null
shadowHost: HTMLDivElement | null;
shadowRoot: ShadowRoot | null;
mountedInto: HTMLDivElement | null;
unmountRoot: () => void | null;
```

Hook usage: 

```tsx
import React from 'react';
import { useShadowDom } from "inject-react-anywhere";

const Greeter = ({name}) => {
    const { insideShadowDom, unmountRoot, shadowRoot, shadowHost, mountedInto } = useShadowDom();

    // Please keep in mind that your components might be rendered not in Shadow DOM, but in usual pages too.
    // So don't forget to check that `insideShadowDom` is true

    return (<StyledPopup>
        Hello, {name}! How are you?

        {insideShadowDom && <div>Wow, I'm rendered in ShadowDOM!</div>}
    </StyledPopup>)
};
```

HOC usage:

```tsx
import React from 'react';
import { withShadowDom } from "inject-react-anywhere";

class Greeter extends React.Component {
    // But don't forget to check if component is indeed rendered in ShadowDOM
    render() {
        return (<StyledPopup>
            Hello, {name}! How are you?

            {this.props.insideShadowDom && <div>Wow, I'm rendered in ShadowDOM!</div>}
        </StyledPopup>);
    }
}

export default withShadowDom(Greeter);
```

### emotion

This function accepts `options` object with single field `stylisPlugins` which will be passed to emotion. Refer to [emotion docs](https://emotion.sh/docs/@emotion/cache#stylisplugins) for more details.

### styledComponents

This function accepts `options` object with fields `disableCSSOMInjection`, `disableVendorPrefixes` and `stylisPlugins`. They will be passed to styled-components library without modification. Refer to [styled-components docs](https://styled-components.com/docs/api#stylesheetmanager) for more details.

## License

MIT

[npmv-image]: https://img.shields.io/npm/v/inject-react-anywhere.svg?style=flat-square
[npmv-url]: https://www.npmjs.com/package/inject-react-anywhere
[npmd-image]: https://img.shields.io/npm/dm/inject-react-anywhere.svg?style=flat-square
[npmd-url]: https://www.npmjs.com/package/inject-react-anywhere