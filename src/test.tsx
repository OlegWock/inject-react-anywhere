import React from 'react';
import ReactDOM from 'react-dom';
import { injectComponent } from './inject.js';
import { createInjectableComponent } from './wrapper.js';

interface TestProps {
    name: string;
    age: number;
}

const Test = React.forwardRef<HTMLDivElement, TestProps>((props, ref) => {
    return (
        <div ref={ref}>
            Hello I'm {props.name} and I'm {props.age} years old
        </div>
    );
});

const main = async () => {
    const injectableTest = createInjectableComponent(Test, {
        styles: null,
    });

    const widget = await injectComponent(injectableTest, {
        name: 'Oleh',
        age: 22,
    });

    widget.ref;
};

main();
