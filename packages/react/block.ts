import { createElement, Fragment, useCallback, useMemo, useRef } from 'react';
import type { ComponentType, Ref } from 'react';
import {
  block as createBlock,
  mount$,
  patch as patchBlock,
  remove$ as removeBlock
} from '../million/block';
import { MapSet$, MapHas$ } from '../million/constants';
import type { Options, MillionProps, MillionPortal } from '../types';
import { processProps, unwrap } from './utils';
import { Effect, RENDER_SCOPE, REGISTRY, SVG_RENDER_SCOPE } from './constants';
import { experimental_options } from '../million/experimental';
import { useContainer, useNearestParent } from './its-fine';
import { cloneNode$ } from '../million/dom';

experimental_options.noSlot = true;

export const block = <P extends MillionProps>(
  fn: ComponentType<P> | null,
  options: Options<P> | null | undefined = {}
) => {
  const noSlot = options?.experimental_noSlot ?? experimental_options.noSlot
  let blockTarget: ReturnType<typeof createBlock> | null = options?.block;
  const defaultType = options?.svg ? SVG_RENDER_SCOPE : RENDER_SCOPE;

  if (fn) {
    blockTarget = createBlock(
      fn as any,
      unwrap as any,
      options?.shouldUpdate as Parameters<typeof createBlock>[2],
      options?.svg
    );
  }

  const MillionBlock = <P extends MillionProps>(
    props: P,
    forwardedRef: Ref<any>
  ) => {
    const container = useContainer<HTMLElement>(); // usable when there's no parent other than the root element
    const parentRef = useNearestParent<HTMLElement>();
    const hmrTimestamp = props._hmr;
    const ref = useRef<HTMLElement | null>(null);
    const patch = useRef<((props: P) => void) | null>(null);
    const portalRef = useRef<MillionPortal[]>([]);

    props = processProps(props, forwardedRef, portalRef.current);
    patch.current?.(props);

    const effect = useCallback(() => {
      if (!ref.current && !noSlot) return;
      const currentBlock = blockTarget!(props, props.key);
      if (hmrTimestamp && ref.current && ref.current.textContent) {
        ref.current.textContent = '';
      }
      if (noSlot) {
        ref.current = (parentRef.current ?? container.current) as HTMLElement;
        if (ref.current.childNodes.length) {
          console.error(new Error(`\`experimental_options.noSlot\` does not support having siblings at the moment.
The block element should be the only child of the \`${
            (cloneNode$.call(ref.current) as HTMLElement).outerHTML
          }\` element.
To avoid this error, \`experimental_options.noSlot\` should be false`));
        }
      }
      if (patch.current === null || hmrTimestamp) {
        mount$.call(currentBlock, ref.current!, null);
        patch.current = (props: P) => {
          patchBlock(
            currentBlock,
            blockTarget!(
              props,
              props.key,
              options?.shouldUpdate as Parameters<typeof createBlock>[2]
            )
          );
        };
      }
      return () => {
        removeBlock.call(currentBlock)
      }
    }, []);

    const marker = useMemo(() => {
      if (noSlot) {
        return null
      }
      return createElement(options?.as ?? defaultType, { ref });
    }, []);

    const childrenSize = portalRef.current.length;
    const children = new Array(childrenSize);

    children[0] = marker;
    children[1] = createElement(Effect, {
      effect,
      deps: hmrTimestamp ? [hmrTimestamp] : [],
    });
    for (let i = 0; i < childrenSize; ++i) {
      children[i + 2] = portalRef.current[i]?.portal;
    }

    const vnode = createElement(Fragment, { children });

    return vnode;
  };

  if (!MapHas$.call(REGISTRY, MillionBlock)) {
    MapSet$.call(REGISTRY, MillionBlock, block);
  }

  // TODO add dev guard
  if (options?.name) {
    if (fn) {
      fn.displayName = `Million(Render(${options.name}))`;
    }
    MillionBlock.displayName = `Million(Block(${options.name}))`;
  }

  return MillionBlock<P>;
};
