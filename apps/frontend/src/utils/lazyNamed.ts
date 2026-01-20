import type { ComponentType, LazyExoticComponent } from 'react';
import { lazy } from 'react';

export function lazyNamed<
  T extends Record<string, ComponentType<any>>,
  K extends keyof T,
>(factory: () => Promise<T>, exportName: K): LazyExoticComponent<T[K]> {
  return lazy(async () => {
    const module = await factory();
    return {
      default: module[exportName] as T[K],
    };
  });
}
