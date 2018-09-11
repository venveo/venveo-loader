export const EVENT_ERROR = 'error'
export const EVENT_DONE = 'done'
export const EVENT_NO_DATA = 'no-data'
export const EVENT_REQUEST_ABORTED = 'request-aborted'
export const EVENT_LAST_PAGE = 'last-page'
export const EVENT_FIRST_PAGE = 'first-page'
export const EVENT_LOADING = 'loading'
export const EVENT_INIT = 'init'
export const EVENT_BEFORE_RESET = 'before-reset'
export const EVENT_AFTER_RESET = 'after-reset'

export const createErrorEvent = (error) => {
    return new CustomEvent(EVENT_ERROR, {error: error})
}

export const createLoadingEvent = () => {
    return new CustomEvent(EVENT_LOADING)
}

export const createInitEvent = () => {
    return new CustomEvent(EVENT_INIT)
}

export const createDoneLoadingEvent = () => {
    return new CustomEvent(EVENT_DONE)
}

export const createNoMoreDataEvent = () => {
    return new CustomEvent(EVENT_NO_DATA)
}

export const createRequestAbortedEvent = () => {
    return new CustomEvent(EVENT_REQUEST_ABORTED)
}

export const createLastPageEvent = () => {
    return new CustomEvent(EVENT_LAST_PAGE)
}

export const createFirstPageEvent = () => {
    return new CustomEvent(EVENT_FIRST_PAGE)
}

export const createBeforeResetEvent = () => {
    return new CustomEvent(EVENT_BEFORE_RESET)
}

export const createAfterResetEvent = () => {
    return new CustomEvent(EVENT_AFTER_RESET)
}
