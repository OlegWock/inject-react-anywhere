export const createMirror = <T extends Element>(source: T, destination?: T) => {
    let mirror: T;
    if (destination) {
        mirror = destination;
        mirror.innerHTML = source.innerHTML;
        [...source.attributes].forEach((attr) => {
            mirror.setAttribute(attr.nodeName, attr.nodeValue!);
        });
    } else {
        mirror = source.cloneNode(true) as T;
    }
    const observer = new MutationObserver((changes) => {
        changes.forEach((ch) => {
            if (ch.type === 'attributes' && ch.target === source) {
                mirror.setAttribute(ch.attributeName!, source.getAttribute(ch.attributeName!)!);
            }
        });
        mirror.innerHTML = source.innerHTML;
    });
    observer.observe(source, {
        subtree: true,
        attributes: true,
        characterData: true,
        childList: true,
    });

    return {
        mirror,
        stop: () => observer.disconnect(),
        resume: () =>
            observer.observe(source, {
                subtree: true,
                attributes: true,
                characterData: true,
            }),
    };
};
