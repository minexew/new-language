import {ok as assert} from 'assert';

function isValidPath(type) {
    return (type instanceof Path) || (type instanceof Ident);
}

function isValidType(type) {
    return (type instanceof Ident);
}

// ----------------------------------------------------------------------- //
// TYPE EXPRESSIONS
// ----------------------------------------------------------------------- //

export class TypeExpression {
    span: any;
    constructor(span) {
        this.span = span;
    }
}

export class PointerType extends TypeExpression {
    restOfType: any;
    constructor(restOfType, span) {
        super(span);

        assert(restOfType instanceof TypeExpression);

        this.restOfType = restOfType;
    }
}

export class TupleType extends TypeExpression {
    items: any;
    constructor(items, span) {
        super(span);

        for (const [name, type] of items) {
            assert((name === null) || (name instanceof Ident));
            assert(type instanceof TypeExpression);
        }

        this.items = items;
    }
}

export class TypeName extends TypeExpression {
    value: any;
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

// ----------------------------------------------------------------------- //
// EXPRESSIONS
// ----------------------------------------------------------------------- //

export class Expression {
    span: any;
    constructor(span) {
        this.span = span;
    }
}

export class BinaryExpression extends Expression {
    binaryType: any;
    left: any;
    right: any;
    static ADD: string;
    static BITWISE_AND: string;
    static BITWISE_OR: string;
    static BITWISE_XOR: string;
    static EQUAL: string;
    static GREATER_EQUAL: string;
    static GREATER_THAN: string;
    static LESS_EQUAL: string;
    static LESS_THAN: string;
    static LOGIC_AND: string;
    static LOGIC_OR: string;
    static NOT_EQUAL: string;
    static SHIFT_L: string;
    static SUBTRACT: string;
    constructor(type, left, right, span) {
        super(span);

        assert(left instanceof Expression);
        assert(right instanceof Expression);

        this.binaryType = type;
        this.left = left;
        this.right = right;
    }
}

BinaryExpression.ADD =              '+';
BinaryExpression.BITWISE_AND =      '&';
BinaryExpression.BITWISE_OR =       '|';
BinaryExpression.BITWISE_XOR =      '^';
BinaryExpression.EQUAL =            '==';
BinaryExpression.GREATER_EQUAL =    '>=';
BinaryExpression.GREATER_THAN =     '>';
BinaryExpression.LESS_EQUAL =       '<=';
BinaryExpression.LESS_THAN =        '<';
BinaryExpression.LOGIC_AND =        '&&';
BinaryExpression.LOGIC_OR =         '||';
BinaryExpression.NOT_EQUAL =        '!=';
BinaryExpression.SHIFT_L =          '<<';
BinaryExpression.SUBTRACT =         '-';

export class CallExpression extends Expression {
    callable: any;
    arguments: any;
    constructor(callable, arguments_) {
        super(null);

        assert(callable instanceof Expression);
        assert(arguments_ instanceof ArgumentList);

        this.callable = callable;
        this.arguments = arguments_;
    }
}

export class IndexExpression extends Expression {
    expression: any;
    index: any;
    constructor(expression, index, span) {
        super(span);

        assert(expression instanceof Expression);
        assert((index === null) || (index instanceof Expression));

        this.expression = expression;
        this.index = index;
    }
}

export class MemberExpression extends Expression {
    expression: any;
    member: any;
    constructor(expression, member, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(member instanceof Ident);

        this.expression = expression;
        this.member = member;
    }
}

export class NewExpression extends Expression {
    className: any;
    arguments: any;
    constructor(className, arguments_, span) {
        super(span);

        assert(className instanceof Expression);
        assert(arguments_ instanceof ArgumentList);

        this.className = className;
        this.arguments = arguments_;
    }
}

export class SliceExpression extends Expression {
    left: any;
    right: any;
    constructor(left, right, span) {
        super(span);

        assert(left instanceof Expression);
        assert(right instanceof Expression);

        this.left = left;
        this.right = right;
    }
}

export class TypeCastExpression extends Expression {
    expression: any;
    type: any;
    constructor(expression, type, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(type instanceof TypeExpression);

        this.expression = expression;
        this.type = type;
    }
}

export class UnaryExpression extends Expression {
    unaryType: any;
    right: any;
    static NOT: string;
    static POSTFIX_DECREMENT: string;
    static POSTFIX_INCREMENT: string;
    constructor(type, right, span) {
        super(span);

        assert(right instanceof Expression);

        this.unaryType = type;
        this.right = right;
    }
}

UnaryExpression.NOT = '!';
UnaryExpression.POSTFIX_DECREMENT = '--';
UnaryExpression.POSTFIX_INCREMENT = '++';

export class Ident extends Expression {
    value: any;
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

export class Literal extends Expression {
    constructor(span) {
        super(span);
    }
}

export class ReturnValueExpression extends Expression {
    constructor(span) {
        super(span);
    }
}

export class RootNamespace extends Expression {
    constructor(span) {
        super(span);
    }
}

export class Path extends Expression {
    namespace: any;
    member: any;
    constructor(namespace, member, span) {
        super(span);

        assert(namespace instanceof RootNamespace || namespace instanceof Path || namespace instanceof Ident);
        assert(member instanceof Ident);

        this.namespace = namespace;
        this.member = member;
    }
}

export class SuperMethodExpression extends Expression {
    constructor(span) {
        super(span);
    }
}

export class LiteralInteger extends Literal {
    value: number;

    constructor(value: number, span) {
        super(span);

        this.value = value;
    }
}

export class LiteralString extends Literal {
    text: any;
    singleQuoted: any;
    constructor(text, singleQuoted, span) {
        super(span);
        this.text = text;
        this.singleQuoted = singleQuoted;
    }
}

// ----------------------------------------------------------------------- //
// STATEMENTS
// ----------------------------------------------------------------------- //

export class Statement {
    span: any;
    constructor(span) {
        this.span = span;
    }
}

export class AssignmentStatement extends Statement {
    target: any;
    expression: any;
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

export class DelStatement extends Statement {
    expression: any;
    constructor(expression, span) {
        super(span);

        assert(expression instanceof Expression);

        this.expression = expression;
    }
}

export class ExpressionStatement extends Statement {
    expression: any;
    constructor(expression, span) {
        super(span);

        assert(expression instanceof Expression);

        this.expression = expression;
    }
}

export class ForListStatement extends Statement {
    varDecl: any;
    expression: any;
    body: any;
    constructor(varDecl, expression, body, span) {
        super(span);

        assert((varDecl instanceof VarStatement) || (varDecl instanceof Ident));    // TODO: I don't like this hybridism one bit
        assert(expression instanceof Expression);
        assert(body instanceof Block);

        this.varDecl = varDecl;
        this.expression = expression;
        this.body = body;
    }
}

export class FunctionStatement extends Statement {
    name: any;
    inputTuple: any;
    outputTuple: any;
    attributes: any;
    body: any;
    constructor(name, inputTuple, outputTuple, attributes, body, span) {
        super(span);

        assert(name instanceof Ident);
        assert(inputTuple instanceof TupleType);
        assert(outputTuple instanceof TupleType);
        assert((body === null) || (body instanceof Block));

        this.name = name;
        this.inputTuple = inputTuple;
        this.outputTuple = outputTuple;
        this.attributes = attributes;
        this.body = body;
    }
}

export class IfStatement extends Statement {
    expression: any;
    body: any;
    elseBody: any;
    constructor(expression, body, elseBody, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(body instanceof Block);
        assert(elseBody === null || (elseBody instanceof Block));

        this.expression = expression;
        this.body = body;
        this.elseBody = elseBody;
    }
}

export class MinusAssignmentStatement extends Statement {
    target: any;
    expression: any;
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

export class PlusAssignmentStatement extends Statement {
    target: any;
    expression: any;
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

export class ReturnStatement extends Statement {
    expression: Expression | null;

    constructor(expression: Expression | null, span) {
        super(span);

        this.expression = expression;
    }
}

export class SpawnStatement extends Statement {
    expression: any;
    body: any;
    constructor(expression, body, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(body instanceof Block);

        this.expression = expression;
        this.body = body;
    }
}

export class TypeDeclarationStatement extends Statement {
    name: any;
    definition: any;
    constructor(name, definition, span) {
        super(span);

        assert(name instanceof TypeName);
        assert((definition === null) || (definition instanceof TypeExpression));

        this.name = name;
        this.definition = definition;
    }
}

export class VarStatement extends Statement {
    name: any;
    value: any;
    constructor(name, value, span) {
        super(span);

        assert(name instanceof Ident);
        //assert((value === null) || (value instanceof Expression));
        assert(value instanceof Expression);

        this.name = name;
        this.value = value;
    }
}

// ----------------------------------------------------------------------- //
// OTHER
// ----------------------------------------------------------------------- //

// class ArgumentDeclList {
//     constructor(span) {
//         this.span = span;

//         this.arguments = [];
//     }

//     pushArgument(name, type) {
//         assert(name instanceof Ident);
//         assert((type === null) || isValidType(type));

//         this.arguments.push([name, type]);
//     }
// }

export class ArgumentList {
    span: any;
    named: any[];
    positional: any[];
    constructor(span) {
        this.span = span;

        this.named = [];
        this.positional = [];
    }

    pushNamed(name, expr, span) {
        assert(name instanceof Ident);
        assert(expr instanceof Expression);

        this.named.push([name, expr, span]);
    }

    pushPositional(expr) {
        assert(expr instanceof Expression);

        this.positional.push(expr);
    }
}

export class Block {
    statements: any[];
    constructor() {
        this.statements = [];
    }

    pushStatement(statement) {
        assert(statement instanceof Statement);

        this.statements.push(statement);
    }
}

// export class Struct {
//     constructor(name, fields) {
//         assert(name instanceof Ident);

//         this.name = name;
//         this.fields = fields;
//     }
// }

// class Scope {
//     constructor() {
//         this.functions = [];
//         this.types = [];
//     }

//     addFunctionDeclaration(func) {
//         assert(func instanceof Function);

//         this.functions.push(func);
//     }

//     addTypeDeclaration(decl) {
//         assert(decl instanceof TypeDeclaration);

//         this.types.push(decl);
//     }
// }

export class Unit {
    unitName: any;
    body: any;
    constructor(unitName, body) {
        this.unitName = unitName;
        this.body = body;
    }
}
