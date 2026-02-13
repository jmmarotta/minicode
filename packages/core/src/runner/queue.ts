type PendingPromise<T> = {
  resolve: (value: IteratorResult<T>) => void
  reject: (error: unknown) => void
}

export function createAsyncQueue<T>() {
  const values: Array<T> = []
  const pending: Array<PendingPromise<T>> = []

  let closed = false
  let failed: unknown

  const finishPending = () => {
    while (pending.length > 0) {
      const listener = pending.shift()
      if (!listener) {
        continue
      }
      listener.resolve({
        done: true,
        value: undefined,
      })
    }
  }

  const rejectPending = (error: unknown) => {
    while (pending.length > 0) {
      const listener = pending.shift()
      listener?.reject(error)
    }
  }

  const iterable: AsyncIterable<T> = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (values.length > 0) {
            return Promise.resolve({
              done: false,
              value: values.shift() as T,
            })
          }

          if (failed) {
            return Promise.reject(failed)
          }

          if (closed) {
            return Promise.resolve({
              done: true,
              value: undefined,
            })
          }

          return new Promise<IteratorResult<T>>((resolve, reject) => {
            pending.push({
              resolve,
              reject,
            })
          })
        },

        return() {
          closed = true
          finishPending()
          return Promise.resolve({
            done: true,
            value: undefined,
          })
        },

        throw(error) {
          failed = error
          rejectPending(error)
          return Promise.reject(error)
        },
      }
    },
  }

  return {
    iterable,

    push(value: T) {
      if (closed || failed) {
        return
      }

      const listener = pending.shift()
      if (listener) {
        listener.resolve({
          done: false,
          value,
        })
        return
      }

      values.push(value)
    },

    close() {
      if (closed) {
        return
      }

      closed = true
      finishPending()
    },

    fail(error: unknown) {
      if (closed || failed) {
        return
      }

      failed = error
      rejectPending(error)
    },
  }
}
