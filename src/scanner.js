const Node = require('./node')
const {
    ELEMENT_NODE,
    TEXT_NODE,
    COMMENT_NODE,
    DOCUMENT_NODE,
    DOCUMENT_TYPE_NODE
} = Node.NODE_TYPE
const { DoctypeNode, DocumentNode } = Node

/**
 * html5 self close tags <http://xahlee.info/js/html5_non-closing_tag.html>
 *
 * The space before the slash is optional.
 * <area />
 * <base />
 * <br />
 * <col />
 * <command />
 * <embed />
 * <hr />
 * <img />
 * <input />
 * <keygen />
 * <link />
 * <meta />
 * <param />
 * <source />
 * <track />
 * <wbr />
 *
 * Is the Ending Slash Optional?
 * - HTML5: the slash is optional.
 * - HTML4: the slash is technically invalid. However, it's accepted by W3C's HTML validator.
 * - XHTML: The slash is REQUIRED.
 */
const doctypeRe = /^\s*<!doctype\s+(html)(\s+public(\s+('[^']+'|"[^"]+"))?(\s+('[^']+'|"[^"]+"))?)?\s*/i
const elementProcessor = {
    doctype(ctx, tagName, attrs, isSelfColse, input) {
        const parentNode = ctx.path[ctx.path.length - 1]
        const parts = doctypeRe.exec(input) || []
        const node = new DoctypeNode({
            tagName: 'doctype',
            nodeType: DOCUMENT_TYPE_NODE,
            parentNode: parentNode,
            name: parts[1],
            publicId: parts[4] && parts[4].substring(1, parts[4].length - 1),
            systemId: parts[6] && parts[6].substring(1, parts[6].length - 1)
        })
        parentNode.appendChild(node)
    },
    _default(ctx, tagName, attrs, isSelfColse, input) {
        const parentNode = ctx.path[ctx.path.length - 1]
        const node = new Node({
            tagName,
            nodeType: ELEMENT_NODE,
            attrs,
            parentNode
        })
        parentNode.appendChild(node)
        if (!isSelfColse) {
            // deepin
            ctx.path.push(node)
        }
    },
    _selfCloseTag(ctx, tagName, attrs, isSelfColse, input) {
        elementProcessor._default(ctx, tagName, attrs, true, input)
    }
}
// doctype
elementProcessor['!doctype'] = elementProcessor['doctype']
// self close tag
// semicolon to prevent error js parse
;['area', 'base', 'link', 'br', 'hr', 'col', 'command', 'embed',
    'img', 'input', 'keygen', 'meta', 'param', 'source', 'track', 'wbr'].forEach(tag => {
        elementProcessor[tag] = elementProcessor._selfCloseTag
    })

class HtmlScanner {
    constructor() {
        this.reset()
    }
    reset() {
        this.rootNode = new DocumentNode({
            tagName: 'document',
            nodeType: DOCUMENT_NODE
        })
        this.path = [this.rootNode]
    }
    getRootNode() {
        return this.rootNode
    }
    startElement(tagName, attrs, isSelfColse, input) {
        tagName = tagName.toLowerCase()
        if (elementProcessor[tagName]) {
            return elementProcessor[tagName](this, tagName, attrs, isSelfColse, input)
        }
        return elementProcessor._default(this, tagName, attrs, isSelfColse, input)
    }
    endElement(tagName) {
        this.path.pop()
    }
    characters(text) {
        // drop empty text node
        if (/^\s*$/.test(text)) return
        const currentNode = this.path[this.path.length - 1]
        const node = new Node({
            tagName: 'text',
            nodeType: TEXT_NODE,
            textContent: text,
            parentNode: currentNode
        })
        currentNode.appendChild(node)
    }
    comment(text) {
        const currentNode = this.path[this.path.length - 1]
        const node = new Node({
            tagName: 'comment',
            nodeType: COMMENT_NODE,
            textContent: text,
            parentNode: currentNode
        })
        currentNode.appendChild(node)
    }
}

module.exports = HtmlScanner
