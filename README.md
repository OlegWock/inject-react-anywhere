# react-local-toast

[![npm version][npmv-image]][npmv-url]
[![npm downloads][npmd-image]][npmd-url]

> Now you can inject your React components anywhere. Even in 3rd party site's DOM. Without parent styles bleeding inside, without hustle and without iframe.


## Features

* Setups Shadow DOM wrapper for react components for you
* Handles injection of styles for you. Yes, CSS-in-JS too (currently supported `styled-components` and `emotion`)
* Exposes nice API to access additional info about how/where component is mounted
* First-class TypeScript

## Motivation

I mainly develop browser extension. And I find React very useful when it comes to building UI more complex than three inputs and two buttons. And sometimes (a lot of times actually) you need to inject that component into 3rd party site, which you don't control. I spent so much time debugging cases when styles from parent were affecting my widget. 

Okay, we can use Shadow DOM I thought. Of course we can! Will it solve all problems? Not really. Shadow DOM helps, but it comes with it's own bundle of issues (even not counting 'looking like an already dead web technology' here). And do you know which one of them are funniest? Parent styles still affect my widgets! Not that badly as before: parent can't directly style components in shadow DOM, but styles from parent elements of shadow DOM container sometimes still bleeds into inner element.

So at this point you need to manually reset all styles in Shadow DOM and inject your own styles somehow. Turns out most of existing neat tooling (like beloved webpack's `style-loader`) doesn't work with shadow DOM (at least it didn't when I first faced this problem, now it's a bit better, but still far from ideal). So you left with your CSS one on one. You can always import styles as raw string and insert into DOM manually. But it quickly becomes tedious and you start writing your own lib/wrapper to do that. Welcome to the club, buddy. 

Now you can save yourself a couple of hours (or more likely days) and just use this library.

### Why not iframe?

To isolate your component from parent site you can use iframe. You embed component in iframe and then embed iframe on page. Styles are isolated out of the box. But it has its own downsides too:

1. Iframe is isolated from parent. It's his strengths and it's his weakness too. Wanted to access URL of parent page? Too bad! You need to proxy that through another script

2. Iframes might be not allowed on page (hello `frame-src` directive)

3. Iframe requires you to build rectangular components. Wanted to build small button which shows dropdown on click? Oops, try shadow DOM next time

## Tutorial

Yet to be writted

## API reference

Yet to be defined

## License

MIT

[npmv-image]: https://img.shields.io/npm/v/inject-react-anywhere.svg?style=flat-square
[npmv-url]: https://www.npmjs.com/package/inject-react-anywhere
[npmd-image]: https://img.shields.io/npm/dm/inject-react-anywhere.svg?style=flat-square
[npmd-url]: https://www.npmjs.com/package/inject-react-anywhere