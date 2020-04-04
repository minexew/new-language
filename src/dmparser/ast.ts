const assert = require('assert');

function isValidPath(type) {
    return (type instanceof Path) || (type instanceof Ident);
}

function isValidType(type) {
    return (type instanceof Ident);
}

// ----------------------------------------------------------------------- //
// TYPE EXPRESSIONS
// ----------------------------------------------------------------------- //

class TypeExpression {
    constructor(span) {
        this.span = span;
    }
}

class PointerType extends TypeExpression {
    constructor(restOfType, span) {
        super(span);

        assert(restOfType instanceof TypeExpression);

        this.restOfType = restOfType;
    }
}

class TupleType extends TypeExpression {
    constructor(items, span) {
        super(span);

        for (const [name, type] of items) {
            assert((name === null) || (name instanceof Ident));
            assert(type instanceof TypeExpression);
        }

        this.items = items;
    }
}

class TypeName extends TypeExpression {
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

// ----------------------------------------------------------------------- //
// EXPRESSIONS
// ----------------------------------------------------------------------- //

class Expression {
    constructor(span) {
        this.span = span;
    }
}

class BinaryExpression extends Expression {
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

class CallExpression extends Expression {
    constructor(callable, arguments_) {
        super(null);

        assert(callable instanceof Expression);
        assert(arguments_ instanceof ArgumentList);

        this.callable = callable;
        this.arguments = arguments_;
    }
}

class IndexExpression extends Expression {
    constructor(expression, index, span) {
        super(span);

        assert(expression instanceof Expression);
        assert((index === null) || (index instanceof Expression));

        this.expression = expression;
        this.index = index;
    }
}

class MemberExpression extends Expression {
    constructor(expression, member, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(member instanceof Ident);

        this.expression = expression;
        this.member = member;
    }
}

class NewExpression extends Expression {
    constructor(className, arguments_, span) {
        super(span);

        assert(className instanceof Expression);
        assert(arguments_ instanceof ArgumentList);

        this.className = className;
        this.arguments = arguments_;
    }
}

class SliceExpression extends Expression {
    constructor(left, right, span) {
        super(span);

        assert(left instanceof Expression);
        assert(right instanceof Expression);

        this.left = left;
        this.right = right;
    }
}

class TypeCastExpression extends Expression {
    constructor(expression, type, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(type instanceof TypeExpression);

        this.expression = expression;
        this.type = type;
    }
}

class UnaryExpression extends Expression {
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

class Ident extends Expression {
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

class Literal extends Expression {
    constructor(span) {
        super(span);
    }
}

class ReturnValueExpression extends Expression {
    constructor(span) {
        super(span);
    }
}

class RootNamespace extends Expression {
    constructor(span) {
        super(span);
    }
}

class Path extends Expression {
    constructor(namespace, member, span) {
        super(span);

        assert(namespace instanceof RootNamespace || namespace instanceof Path || namespace instanceof Ident);
        assert(member instanceof Ident);

        this.namespace = namespace;
        this.member = member;
    }
}

class SuperMethodExpression extends Expression {
    constructor(span) {
        super(span);
    }
}

class LiteralInteger extends Literal {
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

class LiteralString extends Literal {
    constructor(text, singleQuoted, span) {
        super(span);
        this.text = text;
        this.singleQuoted = singleQuoted;
    }
}

// ----------------------------------------------------------------------- //
// STATEMENTS
// ----------------------------------------------------------------------- //

class Statement {
    constructor(span) {
        this.span = span;
    }
}

class AssignmentStatement extends Statement {
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

class DelStatement extends Statement {
    constructor(expression, span) {
        super(span);

        assert(expression instanceof Expression);

        this.expression = expression;
    }
}

class ExpressionStatement extends Statement {
    constructor(expression, span) {
        super(span);

        assert(expression instanceof Expression);

        this.expression = expression;
    }
}

class ForListStatement extends Statement {
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

class FunctionStatement extends Statement {
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

class IfStatement extends Statement {
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

class MinusAssignmentStatement extends Statement {
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

class PlusAssignmentStatement extends Statement {
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Expression);
        assert(expression instanceof Expression);

        this.target = target;
        this.expression = expression;
    }
}

class ReturnStatement extends Statement {
    constructor(expression, span) {
        super(span);

        assert((expression === null) || (expression instanceof Expression));

        this.expression = expression;
    }
}

class SpawnStatement extends Statement {
    constructor(expression, body, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(body instanceof Block);

        this.expression = expression;
        this.body = body;
    }
}

class TypeDeclarationStatement extends Statement {
    constructor(name, definition, span) {
        super(span);

        assert(name instanceof TypeName);
        assert((definition === null) || (definition instanceof TypeExpression));

        this.name = name;
        this.definition = definition;
    }
}

class VarStatement extends Statement {
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

class ArgumentList {
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

class Block {
    constructor() {
        this.statements = [];
    }

    pushStatement(statement) {
        assert(statement instanceof Statement);

        this.statements.push(statement);
    }
}

// class Struct {
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

class Unit {
    constructor(unitName, body) {
        this.unitName = unitName;
        this.body = body;
    }
}

// module.exports.ArgumentDeclList = ArgumentDeclList;
module.exports.ArgumentList = ArgumentList;
module.exports.AssignmentStatement = AssignmentStatement;
module.exports.BinaryExpression = BinaryExpression;
module.exports.Block = Block;
module.exports.CallExpression = CallExpression;
module.exports.DelStatement = DelStatement;
module.exports.Expression = Expression;
module.exports.ExpressionStatement = ExpressionStatement;
module.exports.ForListStatement = ForListStatement;
module.exports.FunctionStatement = FunctionStatement;
module.exports.Ident = Ident;
module.exports.IfStatement = IfStatement;
module.exports.IndexExpression = IndexExpression;
module.exports.LiteralInteger = LiteralInteger;
module.exports.LiteralString = LiteralString;
module.exports.MemberExpression = MemberExpression;
module.exports.MinusAssignmentStatement = MinusAssignmentStatement;
module.exports.NewExpression = NewExpression;
module.exports.Path = Path;
module.exports.PlusAssignmentStatement = PlusAssignmentStatement;
module.exports.PointerType = PointerType;
module.exports.ReturnStatement = ReturnStatement;
module.exports.ReturnValueExpression = ReturnValueExpression;
module.exports.RootNamespace = RootNamespace;
module.exports.SliceExpression = SliceExpression;
module.exports.SpawnStatement = SpawnStatement;
module.exports.Statement = Statement;
module.exports.SuperMethodExpression = SuperMethodExpression;
module.exports.TupleType = TupleType;
module.exports.TypeCastExpression = TypeCastExpression;
module.exports.TypeDeclarationStatement = TypeDeclarationStatement;
module.exports.TypeExpression = TypeExpression;
module.exports.TypeName = TypeName;
module.exports.UnaryExpression = UnaryExpression;
module.exports.Unit = Unit;
module.exports.VarStatement = VarStatement;
