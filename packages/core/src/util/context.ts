export class NotFound extends Error {
  constructor(public override readonly name: string) {
    super(`No context found for ${name}`)
  }
}

const stores = new Map<string, any>()

export function create<T>(name: string) {
  return {
    use(): T {
      const value = stores.get(name)
      if (!value) {
        throw new NotFound(name)
      }
      return value
    },
    provide<R>(value: T, fn: () => R): R {
      stores.set(name, value)
      try {
        return fn()
      } finally {
        stores.delete(name)
      }
    },
  }
}

export const Context = {
  NotFound,
  create,
}
