class Expression {
    constructor(span) {
        this.span = span;
    }
}

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

        if (!(namespace instanceof RootNamespace) && !(namespace instanceof Path) && !(namespace instanceof Ident))
            throw Error('BUG: invalid namespace');

        if (!(member instanceof Ident))
            throw Error('BUG: invalid member');

        this.namespace = namespace;
        this.member = member;
    }
}

/*

 class NodeLiteralBoolean : public NodeLiteral
 {
 public:
 NodeLiteralBoolean(bool value, SourceSpan span)
 : NodeLiteral(NodeLiteral::Type::boolean, span), value(value) {
 }

 const bool value;
 };
 */
class LiteralInteger extends Literal {
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}
/*
 class NodeLiteralInteger : public NodeLiteral
 {
 public:
 NodeLiteralInteger(Int_t value, SourceSpan span)
 : NodeLiteral(NodeLiteral::Type::integer, span), value(value) {
 }
 /*
 const Int_t value;
 };

 class NodeLiteralObject : public NodeLiteral
 {
 public:
 explicit NodeLiteralObject(SourceSpan span)
 : NodeLiteral(NodeLiteral::Type::object, span) {
 }

 void addProperty(std::string&& propertyName, pool_ptr<NodeExpression>&& expression) {
 properties.emplace_back(std::move(propertyName), std::move(expression));
 }

 const auto& getProperties() const { return properties; }

 private:
 // not a map, accessed mostly in order
 std::vector<std::pair<std::string, pool_ptr<NodeExpression>>> properties;
 };

 class NodeLiteralReal : public NodeLiteral
 {
 public:
 NodeLiteralReal(Real_t value, SourceSpan span)
 : NodeLiteral(NodeLiteral::Type::real, span), value(value) {
 }

 const Real_t value;
 };
 */
class LiteralString extends Literal {
    constructor(text, singleQuoted, span) {
        super(span);
        this.text = text;
        this.singleQuoted = singleQuoted;
    }
}

class Class {
    constructor(path) {
        this.path = path;           // TODO: type check

        this.classDeclarations = [];
        this.variableDeclarations = [];
    }

    pushClassDeclaration(class_) {
        this.classDeclarations.push(class_);
    }

    pushVariableDeclaration(name, value) {
        this.variableDeclarations.push([name, value]);
    }
}

class Unit {
    constructor(unitName) {
        this.unitName = unitName;

        this.classDeclarations = [];
    }

    pushClassDeclaration(class_) {
        this.classDeclarations.push(class_);
    }
}

class Statement {
    constructor(span) {
        this.span = span;
    }
}

class Assignment extends Statement {
    constructor(target, expression, span) {
        super(span);

        if (!(target instanceof Ident))
            throw Error('BUG: invalid target');

        if (!(expression instanceof Expression))
            throw Error('BUG: invalid expression');

        this.target = target;
        this.expression = expression;
    }

    /*SourceSpan getFullSpan() const override { return SourceSpan::union_(target->getFullSpan(), expression->getFullSpan()); }

     const NodeExpression* getExpression() const { return expression.get(); }
     pool_ptr<NodeExpression> getExpression2() const { return expression; }
     const NodeExpression* getTarget() const { return target.get(); }
     pool_ptr<NodeExpression> getTarget2() const { return target; }

     private:
     const pool_ptr<NodeExpression> target, expression;*/
}

module.exports.Assignment = Assignment;
module.exports.Class = Class;
module.exports.Expression = Expression;
module.exports.Ident = Ident;
module.exports.LiteralInteger = LiteralInteger;
module.exports.LiteralString = LiteralString;
module.exports.Path = Path;
module.exports.RootNamespace = RootNamespace;
module.exports.Unit = Unit;
