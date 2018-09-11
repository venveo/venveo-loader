'use strict'
import Mustache from 'mustache'
import _ from 'lodash'
import $ from 'jquery'

import * as events from './events'

class Core {
    constructor() {
        let target = document.createTextNode(null)
        this.addEventListener = this.on = target.addEventListener.bind(target)
        this.removeEventListener = this.off = target.removeEventListener.bind(target)
        this.dispatchEvent = target.dispatchEvent.bind(target)

        this.pageMeta = {}
        this.data = []
        this.refs = []

        this.currentRequest = null

        this.compiledItemPattern = null
        this.compiledContainerPattern = null

        // Define the default properties.
        this.properties = {
            page: 1,
            params: {},
            url: null,
            data: null,
            pageParam: 'page',

            container: null,

            itemTemplates: {},
            itemTemplateSelector: null,

            itemsPerContainer: {},
            containerTemplates: {},
            containerTemplateSelector: null,
        }

        this.init()
    }

    // Increment this.properties.page.
    _changePage = (data) => {
        this.pageMeta = data.meta.pagination
        this.properties.page = this.pageMeta.current_page
        if (this.onLastPage()) {
            this.dispatchEvent(events.createLastPageEvent())
        }
        if (this.onFirstPage()) {
            this.dispatchEvent(events.createFirstPageEvent())
        }
    }

    onLastPage = () => {
        return this.pageMeta.current_page >= this.pageMeta.total_pages
    }

    onFirstPage = () => {
        return this.pageMeta.current_page === 1
    }

    /**
     * Get the URL, apply an parameters and page controls
     * @type {fBound|any}
     * @private
     */
    _getNextUrl = () => {
        let baseURL = `${this.properties.url}?${this.properties.pageParam}=${this.properties.page}`
        if (this.pageMeta && this.pageMeta.links && this.pageMeta.links.next) {
            baseURL = this.pageMeta.links.next
        }
        let URL = document.createElement('a')
        URL.href = baseURL
        let params = JSON.parse('{"' + decodeURI(URL.search.substr(1)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}')
        Object.assign(params, this.properties.params)
        const finalURL = this.properties.url + '?' + $.param(params)
        return finalURL
    }

    /**
     * Get the URL, apply an parameters and page controls
     * @type {fBound|any}
     * @private
     */
    _getPrevUrl = () => {
        let baseURL = `${this.properties.url}?${this.properties.pageParam}=${this.properties.page}`
        if (this.pageMeta && this.pageMeta.links && this.pageMeta.links.previous) {
            baseURL = this.pageMeta.links.previous
        }
        let URL = document.createElement('a')
        URL.href = baseURL
        let params = JSON.parse('{"' + decodeURI(URL.search.substr(1)).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}')
        Object.assign(params, this.properties.params)
        const finalURL = this.properties.url + '?' + $.param(params)
        return finalURL
    }

    /**
     * Parse the templates
     * @private
     */
    _initTemplates = () => {
        // Process our item templates
        for (const prop in this.properties.itemTemplates) {
            if (this.properties.itemTemplates.hasOwnProperty(prop)) {
                Mustache.parse(this.properties.itemTemplates[prop])
            }
        }

        // Process our container templates
        for (const prop in this.properties.containerTemplates) {
            if (this.properties.containerTemplates.hasOwnProperty(prop)) {
                Mustache.parse(this.properties.containerTemplates[prop])
            }
        }
        if (this.properties.containerTemplates.length) {
            this.properties.container.append(Mustache.render(this.properties.itemTemplates[templateKey], item)
            )
        }
    }

    _extractItemTemplate = (patternElement) => {
        if (patternElement && patternElement.type) {
            if (patternElement.type === 'container') {
                return _.map(patternElement.children, (childElement) => this._extractItemTemplate(childElement) )
            }
            else if (patternElement.type === 'item') {
                return patternElement.selector
            }
        }
        else {
            console.log('loader: error compiling item template pattern')
        }
    }

    _compileItemTemplatePattern = () => {
        if (this.properties.templatePattern) {
            console.log('loader: compiling item template pattern...')
            this.compiledItemPattern = _.map(this.properties.templatePattern, (elem) => this._extractItemTemplate(elem))
            this.compiledItemPattern = _.flatten(this.compiledItemPattern)
            console.log('        item template pattern:', this.compiledItemPattern)
        } else {
            this.compiledItemPattern = null
        }
        return this.compiledItemPattern
    }

    _getItemPattern = () => {
        return this.compiledItemPattern || this._compileItemTemplatePattern()
    }


    _extractContainerTemplate = (patternElement) => {
        if (patternElement && patternElement.type) {
            if (patternElement.type === 'container') {
                let current = {
                    selector:patternElement.selector,
                    children:patternElement.children
                }
                return _.flatten(_.map(patternElement.children,
                    (childElement) => this._extractContainerTemplate(childElement)
                )).concat([current])
            }
            else if (patternElement.type === 'item') {
                return []
            }
        }
        else {
            console.log('loader: error compiling container template pattern')
        }
    }

    _compileContainerTemplatePattern = () => {
        if (this.properties.templatePattern) {
            console.log('loader: compiling container template pattern...')
            this.compiledContainerPattern = _.map(this.properties.templatePattern, (elem) => this._extractContainerTemplate(elem))
            this.compiledContainerPattern = _.flatten(this.compiledContainerPattern)
            console.log('        container template pattern:', this.compiledContainerPattern)
        } else {
            this.compiledContainerPattern = null
        }
        return this.compiledContainerPattern
    }

    _getContainerPattern = () => {
        return this.compiledContainerPattern || this._compileContainerTemplatePattern()
    }

    _getContainerCapacity = (containerInSequence) => {
        const containerPattern = this._getContainerPattern()
        const template = containerPattern[containerInSequence % containerPattern.length]
        if (template && template.children) {
            return template.children.length
        } else {
            return 0;
        }
    }


    /**
     * Append templated items to the list
     * @type {fBound|any}
     * @private
     */
    _appendItems = (items) => {
        const itemPattern = this._getItemPattern()
        const $elements = _.map(items.data, (item,i) => {
            return $(this._renderItem(item,i))
        })

        if (itemPattern) {
            let containers = []
            let containerId = 0
            let itemsToInsert = []
            let capacity = this._getContainerCapacity(containerId)
            while ($elements.length || itemsToInsert.length) {
                if ($elements.length && itemsToInsert.length < capacity) {
                    itemsToInsert.push($elements.shift())
                } else if (itemsToInsert.length) {
                    containers.push(this._renderContainer(itemsToInsert, containerId++))
                    itemsToInsert = []
                    capacity = this._getContainerCapacity(containerId)
                } else {
                    console.log('loader: error occurred')
                    break
                }
            }
            this.properties.container.append(containers)
        } else {
            this.properties.container.append($elements)
        }
        this.data.push(...items.data)
    }

    _getContainer = () => {

    }



    /**
     * Render an item using the template selector function
     * @param item
     * @param index
     * @private
     */
    _renderItem = (item,index) => {
        const itemPattern = this._getItemPattern()
        const templateKey = itemPattern ?
            itemPattern[index % itemPattern.length] :
            this.properties.itemTemplateSelector(item)
        return Mustache.render(this.properties.itemTemplates[templateKey], item)
    }

    /**
     * Render an item using the template selector function
     * @param containerItems
     * @param index
     * @private
     */
    _renderContainer = (containerItems,index) => {
        const containerPattern = this._getContainerPattern()
        const templateKey = containerPattern ?
            containerPattern[index % containerPattern.length].selector :
            this.properties.containerTemplateSelector(null)
        const renderedItems = { slot:(_.map(containerItems,
            (e) => {
                return e[0].outerHTML
            })).join('\n') }
        return Mustache.render(this.properties.containerTemplates[templateKey], renderedItems)
    }


    /**
     * Gets more items from the endpoint and renders them
     * @type {fBound|any}
     */
    getMoreItems = () => {
        if (this.currentRequest) {
            this.dispatchEvent(events.createRequestAbortedEvent())
            this.currentRequest.abort()
        }
        this.dispatchEvent(events.createLoadingEvent())
        this.currentRequest = $.ajax({
            method: this.properties.method,
            url: this._getNextUrl(),
            data: this.properties.data,
            success: (data) => {
                if (data.data.length) {
                    // Increment the page of data
                    this._changePage(data)
                    this._appendItems(data)
                    this.dispatchEvent(events.createDoneLoadingEvent())
                } else {
                    this.dispatchEvent(events.createNoMoreDataEvent())
                    this.dispatchEvent(events.createDoneLoadingEvent())
                }
            },
            error: (error) => {
                this.dispatchEvent(events.createErrorEvent(error))
            }
        })
    }


    /**
     * Sets settings upon module instantiation AND allows settings to be changed
     * after instantiation.
     * @type {fBound|any}
     */
    defineSettings = (settings) => {
        Object.assign(this.properties, settings)
        return this.properties
    }

    /**
     * Gets the settings of the loader
     * @returns {{page: number, params: {}, url: null, data: null, pageParam: string, container: null, itemTemplates: {}, itemTemplateSelector: null, itemsPerContainer: null, containerTemplates: {}, containerTemplateSelector: null}|*}
     */
    getSettings = () => {
        return this.properties
    }

    /**
     * Merges in new settings and empties the primary container
     * @param params
     */
    clearAndUpdateParams = (params) => {
        this.dispatchEvent(events.createBeforeResetEvent())
        this.properties.page = 1
        this.data = []
        this.pageMeta = {}
        $(this.properties.container).empty()
        Object.assign(this.properties.params, params)
        this.dispatchEvent(events.createAfterResetEvent())
    }

    goToNextPage = () => {
        // TODO
    }

    goToPrevPage = () => {
        // TODO
    }

    init = (settings) => {
        // Settings
        this.defineSettings(settings)
        // Methods
        this._initTemplates()

        // And we're off...
        this.dispatchEvent(events.createInitEvent())
    }
}

export default Core
