
function Class(obj){
    let {fields, init, superclass, name} = obj
    init = init?init:(
        superclass?superclass.prototype.init:function(){}
    )
    fields = fields?fields:{}
    fields.name = name
    fields.init = init
    fields.super = superclass?superclass:Object
    Object.setPrototypeOf(fields, superclass?superclass.prototype:Object.prototype)
    function inner_constructor(...args){
        let retval = {__proto__: fields}
        fields.init.call(retval, ...args)
        return retval
    }
    inner_constructor.prototype = fields
    if ('style' in fields) {
        let styleNode = document.createElement('style')
        let stylestr = ''
        for ([selector, v] of Object.entries(fields.style)){
            stylestr += `.${fields.name}${selector}{${v}}`
        }
        stylestr += `.${fields.name}::before{content:"${fields.name}";}`
        styleNode.appendChild(document.createTextNode(stylestr))
        document.head.appendChild(styleNode)
    }
    fields.class_ = inner_constructor
    return inner_constructor
}

let livingNode = undefined

function make_element(container, tag, attrs){
    let retval = document.createElement(tag)
    attrs = attrs?attrs:{}
    for ([k,v] of Object.entries(attrs)){
        retval.setAttribute(k, v)
    }
    retval.tabIndex = 0
    let contclass = container.class_
    let className = ''
    do{
        className += ' ' + contclass.prototype.name
        contclass = contclass.prototype.super
        if (contclass.prototype.name === undefined) break;
    }while(true)
    retval.className = className
    function dragstart(e, obj=container){
        e.stopPropagation()
        obj.node.style.opacity = 0.4
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData("text/plain", obj.serialize());
        livingNode = obj
        console.log('ure', obj.name)
        e.dataTransfer.dropEffect = 'move'
    }
    function dragend(e, obj=container){
        e.stopPropagation()
        e.preventDefault()
        console.log('left')
        obj.node.style.opacity = 1
    }
    if (container.parent instanceof List) retval.draggable = true;
    retval.addEventListener('dragstart', dragstart)
    retval.addEventListener('dragend', dragend)
    retval.container = container
    return retval
}
//quality of life sensical dom manipulation utility functions








let Projection = Class({
    name:'Projection',
    fields: {
        handleEvent(e){
            this.event_handlers[e.type].call(this, e)
        },
        register_handlers(){
            for (k of Object.keys(this.event_handlers)){
                this.node.addEventListener(k, this)
            }
        }
    },

})

let Atom = Class({
    name:'Atom',
    superclass: Projection,
    init(parent){
        this.parent = parent
        this.node = make_element(this, 'input', {'pattern':this.pattern.source})
        this.register_handlers()
    },
    fields:{
        event_handlers:{
            keydown(e){
                if (e.shiftKey){
                    if (e.key === 'Backspace'){
                        e.stopPropagation()
                        this.parent.deleteChild(this)
                    }
                }
            }
        },
        serialize(){
            return this.node.value
        },
        issubtype(obj){
            return obj.class_ === this.class_
        },
        list_index(){
            if (this.parent instanceof List){

            }
        }
    }
})
let Empty = Class({
    name:'Atom',
    superclass: Projection,
    init(parent){
        this.parent = parent
        this.node = make_element(this, 'span')
        this.register_handlers()
    },
    fields:{
        event_handlers:{
            keydown(e){
                if (e.shiftKey){
                    if (e.key === 'Backspace'){
                        e.stopPropagation()
                        this.parent.deleteChild(this)
                    }
                }
            }
        },
        serialize(){
            return this.name
        },
        issubtype(obj){
            return obj.class_ === this.class_
        }
    }
})



let Union = Class({
    name:'Union',
    superclass: Projection,
    init(parent){
        this.parent = parent
        this.child = this.default_unionee(this.parent)
        this.node = this.child.node
        this.register_handlers()
    },
    fields:{
        event_handlers:{
            keydown(e){
                if (e.ctrlKey){
                    estr = String.fromCharCode(e.keyCode).toLowerCase()
                    let subel = this.unionees[estr]
                    if (subel){
                        e.stopPropagation()
                        let newchild = subel(this.parent)
                        this.node.replaceWith(newchild.node)
                        this.node = newchild.node
                        this.child = newchild
                        this.register_handlers()
                    }
                }
            }
        },
        serialize(){
            return this.child.serialize()
        },
        issubtype(obj){
            if (obj instanceof Union){

            }
            return obj.class_ === this.class_
        }
    }
})
let List = Class({
    name:'List',
    superclass:Projection,
    init(parent){
        this.parent = parent
        this.node_children = []
        this.node = make_element(this, 'ol')
        this.node.append(presperse())
        this.register_handlers()
    },
    fields:{
        style:{
            ['']:'min-height:10px;'
        },
        event_handlers:{
            keydown(e){
                if (e.altKey){
                    estr = String.fromCharCode(e.keyCode).toLowerCase()
                    if (estr === 'p'){
                        e.stopPropagation()
                        let pushee = this.eltype(this)
                        this.appendChild(pushee)
                    }
                }
                else if (e.shiftKey){
                    if (e.key === 'Backspace'){
                        e.stopPropagation()
                        this.parent.deleteChild(this)
                    }
                }
            }
        },
        deleteChild(child){
            this.node_children.splice(this.node_children.indexOf(child), 1)
            child.node.previousSibling.remove()
            child.node.remove()
        },
        insertAfterChild(child1, child2){
            this.node_children.splice(this.node_children.indexOf(child1), 0, child2)
            child1.node.nextSibling.after(intersperse())
            child1.node.nextSibling.after(child2.node)
            child2.node.focus()
        },
        replaceChild(child1, child2){
            this.node_children.splice(this.node_children.indexOf(child1), 1, child2)
            child1.node.replaceWith(child2.node)
            child2.node.focus()
        },
        prependChild(child){
            this.node_children.splice(0, 0, child)
            this.node.firstChild.after(intersperse())
            this.node.firstChild.after(child.node)
            child.node.focus()
        },
        appendChild(child){
            this.node_children.push(child)
            this.node.append(child.node)
            this.node.append(intersperse())
            child.node.focus()
        },
        serialize(){
            return this.node_children.map(x=>x.serialize()).join()
        }
    }
})
function presperse(){
    let retval = document.createElement('div')
    retval.style = 'height: 10px; background-color: black;'
    function drop(e){
        retval.style.backgroundColor='black'
        child2 = livingNode
        child2.parent.deleteChild(child2)
        e.target.parentNode.container.prependChild(child2)
    }
    function dragenter(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='red'
    }
    function dragover(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='red'
    }
    function dragleave(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='black'
    }
    retval.addEventListener('drop', drop)
    retval.addEventListener('dragenter', dragenter)
    retval.addEventListener('dragover', dragover)
    retval.addEventListener('dragleave', dragleave)
    return retval
}


function intersperse(){
    let retval = document.createElement('div')
    retval.style = 'height: 10px; background-color: black;'
    function drop(e){
        retval.style.backgroundColor='black'
        child2 = livingNode
        child2.parent.deleteChild(child2)
        e.target.parentNode.container.insertAfterChild(e.target.previousSibling.container, child2)
    }
    function dragenter(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='red'
    }
    function dragover(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='red'
    }
    function dragleave(e){
        e.stopPropagation()
        e.preventDefault()
        retval.style.backgroundColor='black'
    }
    retval.addEventListener('drop', drop)
    retval.addEventListener('dragenter', dragenter)
    retval.addEventListener('dragover', dragover)
    retval.addEventListener('dragleave', dragleave)
    return retval
}

let Production = Class({
    name:'Production',
    superclass:Projection,
    init(parent){
        this.parent = parent
        this.node = make_element(this, 'div')
        this.node_children = {}
        for (const [k, v] of Object.entries(this.components)){
            if (v.optional){
                appended_child = document.createComment('')
                this.node.appendChild(appended_child)
                this.node_children[k] = [null, appended_child]
            }
            else{
                child = v.type(this)
                this.node.appendChild(child.node)
                this.node_children[k] = child
            }
        }
        this.register_handlers()
        for (child of this.node.childNodes){
            if (child.tabIndex){child.focus(); break}
        }
    },
    fields:{
        style:{
            ['']:'min-height:10px;'
        },
        event_handlers:{
            keydown(e){
                if (e.altKey && e.ctrlKey){
                    estr = String.fromCharCode(e.keyCode).toLowerCase()
                    let subel = this.node_children[estr]
                    subel = subel?subel:false
                    if (subel){
                        if (subel[0] === null){
                            e.stopPropagation()
                            let newchild = this.components[estr].type(this)
                            subel[1].replaceWith(newchild.node)
                            this.node_children[estr] = newchild
                            newchild.register_handlers()
                            newchild.node.focus()
                        }
                        else{
                            e.stopPropagation()
                            this.node_children[estr].node.focus()
                        }
                    }

                }
                else if (e.shiftKey){
                    if (e.key === 'Backspace'){
                        e.stopPropagation()
                        this.parent.deleteChild(this)
                    }
                }
            }
        },
        deleteChild(child){
            for ([k, v] of Object.entries(this.node_children)){
                if (v === child && this.components[k].optional){
                    appended_child = document.createComment('')
                    this.node_children[k] = [null, appended_child]
                    child.node.replaceWith(appendedChild)
                }
            }
        },
        serialize(){
            return Object.entries(this.node_children)
                .filter(x => x[0] !== null)
                .map(([k, v]) => `${k} : ${v.serialize()}`).join()
        }
    }
})


let Hex = Class({
    name:'Hex',
    superclass:Atom,
    fields:{
        pattern:/[\da-fA-F]+/,
        style:{
            ['']:'background-color:deeppink;'
        }
    }
})

let Dec = Class({
    name:'Dec',
    superclass:Atom,
    fields:{
        pattern:/\d+/,
        style:{
            ['']:'background-color:burlywood;'
        }
    }
})
let Var = Class({
    name:'Var',
    superclass:Atom,
    fields:{
        pattern:/[a-zA-Z]+/,
        style:{
            ['']:'background-color:bisque;'
        }
    }
})
let VarList = Class({
    name:'VarList',
    superclasS:List,
    fields:{
        elype:Var,
        style:{
            ['']:'background-color:crimson;'
        }
    }
})

let Str = Class({
    name:'Str',
    superclass:Atom,
    init(){
        this.node = make_element(this, 'input')
        this.register_handlers()
    },
    fields:{
        style:{
            ['']:'background-color:cornsilk;'
        }
    }
})

let Binopsyn = Class({
    name:'Binopsyn',
    superclass:Atom,
    fields:{
        pattern:/\+-\*\/@/,
        style:{
            ['']:'background-color:coral;'
        },
    }
})

let Unopsyn = Class({
    name:'Unopsyn',
    superclass:Atom,
    fields:{
        pattern:/\+-/,
        style:{
            ['']:'background-color:chartreuse;'
        }
    }
})


let Binop = Class({
    name:'Binop',
    superclass:Production,
    fields:{
        components:{
            o: {type:Binopsyn},
            l:{get type(){return Expr}},
            r:{get type(){return Expr}}
        },
        style:{
            ['']:'background-color:yellow;'
        },
        serialize(){
            return `${this.node_children.l.serialize()} ${this.node_children.o.serialize()} ${this.node_children.r.serialize()}`
        }
    }
})
let Unop = Class({
    name:'Unop',
    superclass:Production,
    fields:{
        components:{
            o: {type:Unopsyn},
            r:{get type(){return Expr}}
        },
        style:{
            ['']:'background-color:magenta;'
        },
        serialize(){
            return `${this.node_children.o.serialize()} ${this.node_children.r.serialize()}`
        }
    }
})

let Expr = Class({
    name:'Expr',
    superclass:Union,
    fields:{
        unionees:{
            s:Str,
            d:Dec,
            h:Hex,
            u:Unop,
            b:Binop,
            v:Var,
            get f(){return Funccall},
            get g(){return Funcexpr}
        },
        default_unionee:Dec,
        style:{
            ['']:'background-color:purple;'
        }
    }
})
let Assyn= Class({
    name:'Assyn',
    superclass:Atom,
    fields:{
        pattern:/=|\+=|-=|\*=|\/=/,
        style:{
            ['']:'background-color:grey;'
        }
    }
})
let Assign = Class({
    name:'Assign',
    superclass:Production,
    fields:{
        components:{
            n:{type:Var},
            a:{type:Assyn},
            e:{type:Expr}
        },
        style:{
            ['']:'background-color:brown;'
        },
        serialize(){
            return `${this.node_children.n.serialize()} ${this.node_children.a.serialize()} ${this.node_children.e.serialize()}`
        }
    }
})
let Statement = Class({
    name:'Statement',
    superclass:Union,
    fields:{
        unionees:{
            e:Expr,
            a:Assign,
        },
        default_unionee:Assign,
        style:{
            ['']:'background-color:orange;'
        }
    }
})
let StatementList = Class({
    name:'Statement',
    superclass:List,
    fields:{
        eltype: Statement,
        style:{
            ['']:'background-color:pink;'
        }
    }
})



let ExprList = Class({
    name:'ExprList',
    superclass:List,
    fields:{
        eltype:Expr,
        style:{
            ['']:'background-color:green;'
        }
    }
})

let Funcexpr = Class({
    name:'Funcdef',
    superclass:Production,
    fields:{
        components:{
            a:{type:VarList, optional:true},
            b:{type:StatementList}
        },
        style:{
            ['']:'background-color:red;'
        }
    }
})
let Funccall = Class({
    name:'Funccall',
    superclass:Production,
    fields:{
        components:{
            a:{type:Expr},
            b:{type:ExprList, optional:true}
        },
        style:{
            ['']:'background-color:cyan;'
        }
    }
})
let Program = Class({
    name:'Program',
    superclass:List,
    fields:{
        eltype:Statement,
        style:{
            ['']:'background-color:blue;'
        },
        serialize(){
            return this.node_children.map(x => x.serialize()).join(';')
        }
    }
})



generic_styles = document.createElement('style')
generic_styles.innerText = `


`

let startel = Program(document.body)
document.body.append(startel.node)
document.body.addEventListener('copy', e => {
    e.stopPropagation()
    e.preventDefault()
    e.clipboardData.setData('text/plain', document.activeElement.container.serialize());
})
startel.node.focus()