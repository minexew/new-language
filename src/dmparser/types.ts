import {ok as assert} from 'assert';

// NamedType refers to declaring statement
// Maybe this can be done differently (keeping the information in SemanticCompiler)
import * as ast from './ast';

export class Type {
    getMember(name: any): Type | null {
        return null;
    }

    getUnderlyingType(): Type {
        return this;
    }

    implicitlyConvertsTo(what: Type): boolean {
        return false;
    }

    toString(): String {
        throw new Error("Cannot stringify type of class " + this.constructor.name);
    }
}

export class ArrayType extends Type {
    itemType: Type;
    sizeType: Type;

    constructor(itemType: Type, sizeType: Type) {
        super();

        this.itemType = itemType;
        this.sizeType = sizeType;
    }

    getMember(name: string) {
        if (name === "length") {
            return this.sizeType;
        }
        else {
            return null;
        }
    }

    toString() {
        return "[] " + this.itemType.toString();
    }
}

export class SliceType extends Type {
    itemType: Type;
    sizeType: Type;

    constructor(itemType: Type, sizeType: Type) {
        super();

        this.itemType = itemType;
        this.sizeType = sizeType;
    }

    getMember(name: string) {
        if (name === "length") {
            return this.sizeType;
        }
        else {
            return null;
        }
    }

    toString() {
        return "[slice] " + this.itemType.toString();
    }
}

export class Nullptr extends Type {
    implicitlyConvertsTo(what: Type) {
        return (what instanceof PointerType);
    }
}

export class NamedType extends Type {
    name: string;
    definition: Type;
    declarationStatement: ast.TypeDeclarationStatement | null;

    constructor(name: string, definition: Type | null, declarationStatement: ast.TypeDeclarationStatement | null) {
        super();

        this.name = name;
        this.definition = definition;
        this.declarationStatement = declarationStatement;
    }

    getMember(name: string) {
        if (this.definition) {
            return this.definition.getMember(name);
        }
        else {
            // TODO: proper diagnostic (report where declared & where used)
            throw Error("Type " + this.name + " has not been fully defined");
        }
    }

    getUnderlyingType(): Type {
        if (this.definition) {
            return this.definition;
        }
        else {
            // TODO: proper diagnostic (report where declared & where used)
            throw Error("Type " + this.name + " has not been fully defined");
        }
    }

    implicitlyConvertsTo(what: Type) {
        if (what == this) {
            return true;
        }
        else if ((what instanceof TupleType) && what.isUnaryTuple(this/*.getUnderlyingType()*/)) {     // TODO: this is mega crap
            return true;
        }

        if (this.definition) {
            return this.definition.implicitlyConvertsTo(what);
        }
        else {
            // TODO: proper diagnostic (report where declared & where used)
            throw Error("Type " + this.name + " has not been fully defined");
        }
    }

    toString() {
        return this.name;
    }
}

export class PointerType extends Type {
    type: Type;

    constructor(type: Type) {
        super();

        this.type = type;
    }

    getMember(name: string) {
        if (!(this.type instanceof PointerType)) {
            return this.type.getMember(name);
        }
        else {
            // TODO: proper diagnostic (report where declared & where used)
            throw Error("Cannot directly de-reference pointer to a pointer " + this.toString());
        }
    }

    toString() {
        return "*" + this.type.toString();
    }
}

export class Integer extends Type {
    min: any; max: any;

    constructor(min: number, max: number) {
        super();

        assert(min <= max);

        this.min = min;
        this.max = max;
    }

    implicitlyConvertsTo(what: Type) {
        if ((what instanceof Integer) && what.min <= this.min && what.max >= this.max) {
            return true;
        }

        return super.implicitlyConvertsTo(what);
    }

    toString() {
        return "Integer(" + this.min + ".." + this.max + ")";
    }
}

export class TupleType extends Type {
    items: any[];

    constructor(items: any[]) {
        super();

        this.items = items;
    }

    getMember(name: string) {
        for (const [ident, type] of this.items) {
            if (ident.value == name) {
                return type;
            }
        }

        return null;
    }

    implicitlyConvertsTo(what: Type) {
        if (what == this) {     // FIXME: disaster
            return true;
        }

        if ((what instanceof TupleType) && what.items.length == this.items.length) {
            // TODO

            if (what.items.length == 0) { // temporary
                return true;
            }
        }

        return super.implicitlyConvertsTo(what);
    }

    isUnaryTuple(type: Type): boolean {
        return this.items.length == 1 && this.items[0][0] == null && this.items[0][1] == type;
    }
}
