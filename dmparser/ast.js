const assert = require('assert');

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

BinaryExpression.SHIFT_L = '<<';

class CallExpression extends Expression {
    constructor(callable, arguments_) {
        super(null);

        assert(callable instanceof Expression);
        assert(arguments_ instanceof ArgumentList);

        this.callable = callable;
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

class Assignment extends Statement {
    constructor(target, expression, span) {
        super(span);

        assert(target instanceof Ident);
        assert(expression instanceof Expression);

        this.target = target;
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

class IfStatement extends Statement {
    constructor(expression, body, span) {
        super(span);

        assert(expression instanceof Expression);
        assert(body instanceof Block);

        this.expression = expression;
        this.body = body;
    }
}

class ReturnStatement extends Statement {
    constructor(expression, span) {
        super(span);

        assert((expression === null) || (expression instanceof Expression));

        this.expression = expression;
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

    pushArgument(name, type, inputMode) {
        assert(name instanceof Ident);
        assert((type === null) || (type instanceof Ident));

        this.arguments.push([name, type, inputMode]);
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

        this.classDeclarations = [];
        this.procedures = [];
        this.properties = [];
        this.variables = [];
    }

    pushClassDeclaration(class_) {
        assert(class_ instanceof Class);

        this.classDeclarations.push(class_);
    }

    pushProcedure(proc) {
        assert(proc instanceof Procedure);

        this.procedures.push(proc);
    }

    pushPropertyDeclaration(name, value) {
        assert(name instanceof Ident);
        assert(value instanceof Expression);        // TODO: what are the limitations here?

        this.properties.push([name, value]);
    }

    pushVariableDeclaration(name) {
        assert(name instanceof Ident);

        this.variables.push(name);
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

        this.classDeclarations = [];
        //this.procedures = [];
    }

    pushClassDeclaration(class_) {
        assert(class_ instanceof Class);

        this.classDeclarations.push(class_);
    }
}

module.exports.ArgumentDeclList = ArgumentDeclList;
module.exports.ArgumentList = ArgumentList;
module.exports.Assignment = Assignment;
module.exports.BinaryExpression = BinaryExpression;
module.exports.Block = Block;
module.exports.CallExpression = CallExpression;
module.exports.Class = Class;
module.exports.Expression = Expression;
module.exports.ExpressionStatement = ExpressionStatement;
module.exports.Ident = Ident;
module.exports.IfStatement = IfStatement;
module.exports.LiteralInteger = LiteralInteger;
module.exports.LiteralString = LiteralString;
module.exports.Path = Path;
module.exports.Procedure = Procedure;
module.exports.ReturnStatement = ReturnStatement;
module.exports.UnaryExpression = UnaryExpression;
module.exports.RootNamespace = RootNamespace;
module.exports.Unit = Unit;
