import * as assert from 'assert';
import * as ast from './ast';
import * as types from './types';

class MyError {
    message: string;
    span: any;
    constructor(message: string, span: any) {
        this.message = message;
        this.span = span;
    }
}

class Variable {
    name: string;
    type: types.Type;
    scope: Scope;
    declarationStatement: any;

    constructor(name: string, type: types.Type, scope: Scope, declarationStatement: ast.Statement | null) {

        this.name = name;
        this.type = type;
        this.scope = scope;
        this.declarationStatement = declarationStatement;
    }
}

class Function {
    name: string;
    inputType: types.TupleType;
    outputType: types.TupleType;

    constructor(name: string, inputType: types.TupleType, outputType: types.TupleType,
            attributes: any, body: any) {
        this.name = name;
        this.inputType = inputType;
        this.outputType = outputType;
    }
}

class Scope {
    parentScope: Scope|null;
    function: Function|null;

    functions: { [name: string]: Function; } = {};
    types: { [name: string]: types.NamedType; } = {};
    variables: {} = {};

    constructor(parentScope: Scope|null, function_: Function|null) {
        this.parentScope = parentScope;
        this.function = function_;
    }

    declareFunction(func: Function, declarationStatement: ast.FunctionStatement): Function|MyError {
        const ident = this.findValueIdent(func.name);

        if (ident) {
            return new MyError("Redefinition of identifier " + ident.name, declarationStatement);
        }

        this.functions[func.name] = func;
        return this.functions[func.name];
    }

    findValueIdent(name: string): Variable | null {
        if (this.variables.hasOwnProperty(name)) {
            return this.variables[name];
        }
        else if (this.parentScope) {
            return this.parentScope.findValueIdent(name);
        }
        else {
            return null;
        }
    }

    findType(name: string): [types.NamedType, Scope] | null {
        if (this.types.hasOwnProperty(name)) {
            return [this.types[name], this];
        }
        else if (this.parentScope) {
            return this.parentScope.findType(name);
        }
        else {
            return null;
        }
    }

    getInnermostFunction(): Function|null {
        if (this.function) {
            return this.function;
        }
        else if (this.parentScope) {
            return this.parentScope.getInnermostFunction();
        }
        else {
            return null;
        }
    }

    insertType(name: string, definition: types.Type | null, declarationStatement: ast.TypeDeclarationStatement | null) {
        const found = this.findType(name);

        if (found) {
            const [type, owningScope] = found;

            // If type already exists AND is a concrete type (e.g. not a forward-declaration), raise an error
            if (type.definition !== null) {
                return new MyError("Redefinition of type " + type.name, declarationStatement.name.span);
                // TODO: print location of original definition
            }

            // If the type was previously forward-declared in another scope, raise an error
            if (owningScope !== this) {
                // TODO: more helpful message
                return new MyError("Definition of type " + type.name + " declared in another scope!", declarationStatement.name.span);
            }
        }

        this.types[name] = new types.NamedType(name, definition, declarationStatement);
        return this.types[name];
    }

    insertVariable(name: string, type: types.Type, declarationStatement: any) {
        const ident = this.findValueIdent(name);

        if (ident) {
            return new MyError("Redefinition of identifier " + ident.name, declarationStatement);
        }

        this.variables[name] = new Variable(name, type, this, declarationStatement);
        return this.variables[name];
    }
}

class SemanticCompiler {
    diag: any;

    typeBool: types.Type;

    // shortcut for "Void" type, aka empty tuple
    typeVoid: types.TupleType;

    constructor(diag: any) {
        this.diag = diag;
    }

    compileUnit(unit: ast.Unit) {
        const superglobalScope = new Scope(null, null);

        const maxSize = 0x7fffffff; // TODO

        this.typeBool = this.insertType(superglobalScope, "Bool", null, null);
        const typeNullptr = this.insertType(superglobalScope, "Nullptr", new types.Nullptr(), null);
        const typeU8 = this.insertType(superglobalScope, "U8", null, null);
        const typeSize = this.insertType(superglobalScope, "Size", new types.Integer(0, maxSize), null);
        const typeString = this.insertType(superglobalScope, "String", new types.ArrayType(typeU8, typeSize), null);
        this.typeVoid = new types.TupleType([]);

        this.insertVariable(superglobalScope, "false", this.typeBool, null);
        this.insertVariable(superglobalScope, "null", typeNullptr, null);   // TODO: consider using "()" for purposes of the null constant
        this.insertVariable(superglobalScope, "true", this.typeBool, null);

        const program = this.compileBlock(unit.body, superglobalScope);
    }

    compileBlock(block: ast.Block, parentScope: Scope) {
        const scope = new Scope(parentScope, null);

        for (const node of block.statements) {
            if (node instanceof ast.AssignmentStatement) {
                const type = this.validateExpression(node.expression, scope);
                this.validateAssignmentTarget(node.target, type, scope);

                // TODO: emit assignment
            }
            else if (node instanceof ast.IfStatement) {
                const type = this.validateExpression(node.expression, scope);

                if (type != this.typeBool) {
                    // TODO: print what type we got instead
                    this.raiseError("Expression in 'if' statement must be boolean", node.expression.span);
                }

                this.compileBlock(node.body, scope);

                if (node.elseBody) {
                    this.compileBlock(node.elseBody, scope);
                }

                // TODO: emit statement
            }
            else if (node instanceof ast.FunctionStatement) {
                this.compileFunction(scope, node);
            }
            else if (node instanceof ast.ReturnStatement) {
                let type;

                const func = scope.getInnermostFunction();

                if (!func) {
                    this.raiseError("Not in a function!", node.span);
                }

                if (node.expression) {
                    type = this.validateExpression(node.expression, scope);
                }
                else {
                    type = this.typeVoid;
                }

                if (!type.implicitlyConvertsTo(func.outputType)) {
                    // TODO: use full span...
                    this.raiseError("Incompatible return type " + type + "; expected " + func.outputType, node.expression.span);
                }

                // TODO: emit assignment
            }
            else if (node instanceof ast.TypeDeclarationStatement) {
                const definition = node.definition ? this.validateTypeExpression(node.definition, scope) : null;
                this.insertType(scope, node.name.value, definition, node);
            }
            else if (node instanceof ast.VarStatement) {
                const type = this.validateExpression(node.value, scope);
                this.insertVariable(scope, node.name.value, type, node);
                // TODO: emit assignment
            }
            else
                assert.fail('Node type not handled: ' + node.constructor.name);
        }
    }

    compileFunction(parentScope: Scope, node: ast.FunctionStatement) {
        const inputType = this.validateTupleTypeExpression(node.inputTuple, parentScope);
        const outputType = this.validateTupleTypeExpression(node.outputTuple, parentScope);
        const func = this.insertFunction(parentScope, node.name.value, inputType, outputType,
                                         node.attributes, node.body, node);

        const scope = new Scope(parentScope, func);

        for (const [name, type] of node.inputTuple.items) {
            const t = this.validateTypeExpression(type, parentScope);
            this.insertVariable(scope, name.value, t, node);
        }

        this.compileBlock(node.body, scope);
    }

    getImplicitlyConvertibleCommonTypeIfExists(left: types.Type, right: types.Type): types.Type|null {
        const lt = left.getUnderlyingType();
        const rt = right.getUnderlyingType();

        if (lt.implicitlyConvertsTo(rt)) {
            return rt;
        }
        else if (rt.implicitlyConvertsTo(lt)) {
            return lt;
        }
        else {
            // TODO: how to handle this, other than special-casing it here?
            // perhaps call lt.getImplicitlyConvertibleCommonTypeIfExists(rt) ?
            if ((lt instanceof types.Integer) && (rt instanceof types.Integer)) {
                return new types.Integer(Math.min(lt.min, rt.min), Math.max(lt.max, rt.max));
            }

            // TODO: how to handle this, other than special-casing it here?
            // perhaps call lt.getImplicitlyConvertibleCommonTypeIfExists(rt) ?
            // also the equality test is wack
            // in facti, these types are just equal, so what are doign here?!
            if ((lt instanceof types.SliceType) && (rt instanceof types.SliceType) && lt.itemType == rt.itemType) {
                return lt;
            }

            return null;
        }
    }

    insertFunction(scope: Scope, name: string, inputType: types.TupleType, outputType: types.TupleType,
            attributes: any, body: any, declarationStatement: ast.FunctionStatement): Function|null {
        const res = scope.declareFunction(new Function(name, inputType, outputType, attributes, body), declarationStatement);

        if (res instanceof MyError) {
            this.raiseError(res.message, res.span);
            return null;
        }

        return res;
    }

    insertType(scope: Scope, name: string, definition: types.Type, declarationStatement: any): types.Type|null {
        const res = scope.insertType(name, definition, declarationStatement);

        if (res instanceof MyError) {
            this.raiseError(res.message, res.span);
            return null;
        }

        return res;
    }

    insertVariable(scope: Scope, name: string, type: types.Type, declarationStatement: any): Variable|null {
        const res = scope.insertVariable(name, type, declarationStatement);

        if (res instanceof MyError) {
            this.raiseError(res.message, res.span);
            return null;
        }

        return res;
    }

    raiseError(what: string, pointOrSpan: any) {
        if (what === undefined)
            what = "Semantic error";
    
        this.diag.error(what, pointOrSpan);
        throw new Error(what);
    }

    validateAssignmentTarget(node: ast.Expression, valueType: any, scope: Scope) {
        if (node instanceof ast.Ident) {
            const ident = scope.findValueIdent(node.value);

            if (!ident) {
                this.raiseError("Unknown name '" + node.value + "'", node.span);
            }

            // FIXME: ensure assignable!
            // TODO: validate type compatibility
            return ident.type;
        }
        else
            assert.fail('Node type not handled: ' + node.constructor.name);
    }

    // Validate and expression and return the resulting type
    validateExpression(node: ast.Expression, scope: Scope): types.Type {
        if (node instanceof ast.BinaryExpression) {
            const leftType = this.validateExpression(node.left, scope);
            const rightType = this.validateExpression(node.right, scope);

            switch (node.binaryType) {
                case ast.BinaryExpression.EQUAL:
                case ast.BinaryExpression.NOT_EQUAL:
                    const commonType = this.getImplicitlyConvertibleCommonTypeIfExists(leftType, rightType);
                    if (!commonType) {
                        this.raiseError("Cannot compare incompatible types " + leftType + " and " + rightType, node.span);
                    }
                    // TODO: emit casts & comparison
                    return this.typeBool;

                case ast.BinaryExpression.LOGIC_AND:
                    // TODO: wack type check
                    if (leftType != this.typeBool || rightType != this.typeBool) {
                        this.raiseError("Invalid operator && for types " + leftType + " and " + rightType, node.span);
                    }
                    // TODO: emit casts & comparison
                    return this.typeBool;

                default:
                    // TODO: implement
                    this.raiseError("Not implemented", node.span);
                    throw "Not implemented";
            }
        }
        else if (node instanceof ast.Ident) {
            const ident = scope.findValueIdent(node.value);

            if (!ident) {
                this.raiseError("Unknown name '" + node.value + "'", node.span);
            }

            return ident.type;
        }
        else if (node instanceof ast.IndexExpression) {
            const type = this.validateExpression(node.expression, scope);

            if (type.getUnderlyingType() instanceof types.ArrayType) {
                const arrayType = type.getUnderlyingType() as types.ArrayType;

                if (node.index) {
                    const indexType = this.validateExpression(node.index, scope);

                    if (!(indexType.getUnderlyingType() instanceof types.Integer)) {
                        this.raiseError("Invalid index type " + indexType, node.span);
                    }

                    // TODO: emit index expression
                    throw new Error("Not implemented yet");
                }
                else {
                    return new types.SliceType(arrayType.itemType, arrayType.sizeType);
                }
            }
            else {
                this.raiseError("Non-indexable type " + type, node.span);
            }
        }
        else if (node instanceof ast.LiteralInteger) {
            return new types.Integer(node.value, node.value);
        }
        else if (node instanceof ast.MemberExpression) {
            const type = this.validateExpression(node.expression, scope);

            const memberType = type.getMember(node.member.value);

            if (!memberType) {
                this.raiseError("No member named '" + node.member.value + "' in type " + type, node.span);
            }

            return memberType;
        }
        else if (node instanceof ast.TypeCastExpression) {
            const oldType = this.validateExpression(node.expression, scope);
            const newType = this.validateTypeExpression(node.type, scope);

            if (!oldType.implicitlyConvertsTo(newType)) {
                this.raiseError("Cannot cast " + oldType + " to incompatible type " + newType, node.span);
            }

            // TODO: emit cast...
            return newType;
        }
        else
            assert.fail('Node type not handled: ' + node.constructor.name);
    }

    validateTupleTypeExpression(node: ast.TupleType, scope: Scope): types.TupleType {
        // TODO: cache these

        const items = [];

        for (const [name, type] of node.items) {
            const t = this.validateTypeExpression(type, scope);
            items.push([name, t]);
        }

        return new types.TupleType(items);
    }

    validateTypeExpression(node: ast.TypeExpression, scope: Scope): types.Type {
        if (node instanceof ast.PointerType) {
            // scope.findType(node.value)
            const type = this.validateTypeExpression(node.restOfType, scope);

            return new types.PointerType(type);
        }
        else if (node instanceof ast.TupleType) {
            return this.validateTupleTypeExpression(node, scope);
        }
        else if (node instanceof ast.TypeName) {
            const found = scope.findType(node.value);

            if (!found) {
                this.raiseError("Unknown type name '" + node.value + "'", node.span);
            }

            const [type, owningScope] = found;
            return type;
        }
        else
            assert.fail('Node type not handled: ' + node.constructor.name);
    }
}

module.exports = SemanticCompiler;
