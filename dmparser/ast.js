const assert = require('assert');

function isValidPath(type) {
    return (type instanceof Path) || (type instanceof Ident);
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

class MemberExpression extends Expression {
    constructor(expression, name, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(name instanceof Ident);

        this.expression = expression;
        this.name = name;
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

class VarStatement extends Statement {
    constructor(name, type, value, isTmp, span) {
        super(span);

        assert(name instanceof Ident);
        assert((type === null) || (type instanceof Expression));
        assert((value === null) || (value instanceof Expression));
        assert(isTmp === true || isTmp === false);

        this.name = name;
        this.type = type;
        this.value = value;
        this.isTmp = isTmp;
    }
}

// ----------------------------------------------------------------------- //
// OTHER
// ----------------------------------------------------------------------- //

class ArgumentDeclList {
    constructor(span) {
        this.span = span;

        this.arguments = [];
    }

    pushArgument(name, type, inputMode, inSet) {
        assert(name instanceof Ident);
        assert((type === null) || isValidPath(type));
        assert((inputMode === null) || (inputMode instanceof Ident));
        assert((inSet === null) || (inSet instanceof Expression));      // TODO: too broad

        this.arguments.push([name, type, inputMode, inSet]);
    }
}

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

class Class {
    constructor(path) {
        this.path = path;           // TODO: type check

        this.classes = [];
        this.procedures = [];
        this.properties = [];
        this.variables = [];
        this.verbs = [];
    }

    pushClassDeclaration(class_) {
        assert(class_ instanceof Class);

        this.classes.push(class_);
    }

    pushProc(proc, declaredInProcBlock) {
        assert(proc instanceof Procedure);

        this.procedures.push([proc, declaredInProcBlock]);
    }

    pushPropertyDeclaration(name, value) {
        assert(name instanceof Ident);
        assert(value instanceof Expression);        // TODO: what are the limitations here?

        this.properties.push([name, value]);
    }

    pushVariableDeclaration(declaration) {
        assert(declaration instanceof VarStatement);

        this.variables.push(declaration);
    }

    pushVerb(verb) {
        assert(verb instanceof Procedure);

        this.verbs.push(verb);
    }
}

class Procedure {
    constructor(name, arguments_, body) {
        // TODO: do we want to have different ArgumentDeclList types for procs vs verbs?

        assert(name instanceof Ident);
        assert(arguments_ instanceof ArgumentDeclList);
        assert(body instanceof Block);

        this.name = name;
        this.arguments = arguments_;
        this.body = body;
    }
}

class Unit {
    constructor(unitName) {
        this.unitName = unitName;

        this.classes = [];
        //this.procedures = [];
    }

    pushClassDeclaration(class_) {
        assert(class_ instanceof Class);

        this.classes.push(class_);
    }
}

module.exports.ArgumentDeclList = ArgumentDeclList;
module.exports.ArgumentList = ArgumentList;
module.exports.AssignmentStatement = AssignmentStatement;
module.exports.BinaryExpression = BinaryExpression;
module.exports.Block = Block;
module.exports.CallExpression = CallExpression;
module.exports.Class = Class;
module.exports.DelStatement = DelStatement;
module.exports.Expression = Expression;
module.exports.ExpressionStatement = ExpressionStatement;
module.exports.ForListStatement = ForListStatement;
module.exports.Ident = Ident;
module.exports.IfStatement = IfStatement;
module.exports.LiteralInteger = LiteralInteger;
module.exports.LiteralString = LiteralString;
module.exports.MemberExpression = MemberExpression;
module.exports.NewExpression = NewExpression;
module.exports.Path = Path;
module.exports.Procedure = Procedure;
module.exports.ReturnStatement = ReturnStatement;
module.exports.ReturnValueExpression = ReturnValueExpression;
module.exports.RootNamespace = RootNamespace;
module.exports.SpawnStatement = SpawnStatement;
module.exports.SuperMethodExpression = SuperMethodExpression;
module.exports.UnaryExpression = UnaryExpression;
module.exports.Unit = Unit;
module.exports.VarStatement = VarStatement;
