const ast = require('../dmparser/ast');
const SpanSerializer = require('./SpanSerializer');

const assert = require('assert');

class AstSerializer {
    static serializeNode(node, spanSerializer) {
        const sn = (node) => this.serializeNode(node, spanSerializer);
        const ss = (span) => spanSerializer.serializeSpan(span);

        if (node instanceof ast.ArgumentDeclList) {
            return {
                type: 'ArgumentDeclList',
                arguments: node.arguments.map(([name, type, inputType, inSet]) => ({
                    name: sn(name),
                    type: type ? sn(type) : null,
                    inputType: inputType ? sn(inputType) : null,
                    inSet: inSet ? sn(inSet) : null,
                })),
            };
        }
        else if (node instanceof ast.ArgumentList) {
            return {
                type: 'ArgumentList',
                named: node.named.map(([name, expr, span]) => ({
                    name: sn(name),
                    type: sn(expr),
                    span: ss(span),
                })),
                positional: node.positional.map((expr) => sn(expr)),
            };
        }
        else if (node instanceof ast.AssignmentStatement) {
            return {
                type: 'AssignmentStatement',
                span: ss(node.span),
                target: sn(node.target),
                expression: sn(node.expression),
            };
        }
        else if (node instanceof ast.BinaryExpression) {
            return {
                type: 'BinaryExpression',
                span: ss(node.span),
                binaryType: node.binaryType,
                left: sn(node.left),
                right: sn(node.right),
            };
        }
        else if (node instanceof ast.Block) {
            return {
                type: 'Block',
                statements: node.statements.map((statement) => sn(statement)),
            };
        }
        else if (node instanceof ast.CallExpression) {
            return {
                type: 'CallExpression',
                span: ss(node.span),
                callable: sn(node.callable),
                arguments: sn(node.arguments),
            };
        }
        else if (node instanceof ast.Class) {
            return {
                type: 'Class',
                span: ss(node.span),
                path: sn(node.path),
                classes: node.classes.map((class_) => sn(class_)),
                procedures: node.procedures.map(([procedure, declaredInProcBlock]) => ({
                    procedure: sn(procedure),
                    declaredInProcBlock: declaredInProcBlock,
                })),
                properties: node.properties.map(([name, expression, span]) => ({
                    name: sn(name),
                    expression: sn(expression),
                    span: ss(span),
                })),
                variables: node.variables.map((variable) => sn(variable)),
                verbs: node.verbs.map((procedure) => sn(procedure)),
            };
        }
        else if (node instanceof ast.DelStatement) {
            return {
                type: 'DelStatement',
                span: ss(node.span),
                expression: node.expression ? sn(node.expression) : null,
            };
        }
        else if (node instanceof ast.ExpressionStatement) {
            return {
                type: 'ExpressionStatement',
                span: ss(node.span),
                expression: sn(node.expression),
            };
        }
        else if (node instanceof ast.ForListStatement) {
            return {
                type: 'ForListStatement',
                span: ss(node.span),
                varDecl: sn(node.varDecl),
                expression: sn(node.expression),
                body: sn(node.body),
            };
        }
        else if (node instanceof ast.Ident) {
            return {type: 'Ident', span: ss(node.span), value: node.value};
        }
        else if (node instanceof ast.IfStatement) {
            return {
                type: 'IfStatement',
                span: ss(node.span),
                expression: sn(node.expression),
                body: sn(node.body),
                elseBody: node.elseBody ? sn(node.elseBody) : null,
            };
        }
        else if (node instanceof ast.LiteralInteger) {
            return {type: 'LiteralInteger', span: ss(node.span), value: node.value};
        }
        else if (node instanceof ast.LiteralString) {
            return {type: 'LiteralString', span: ss(node.span), text: node.text, singleQuoted: node.singleQuoted};
        }
        else if (node instanceof ast.MemberExpression) {
            return {
                type: 'MemberExpression',
                span: ss(node.span),
                expression: sn(node.expression),
                name: sn(node.name),
            };
        }
        else if (node instanceof ast.NewExpression) {
            return {
                type: 'NewExpression',
                span: ss(node.span),
                className: sn(node.className),
                arguments: sn(node.arguments),
            };
        }
        else if (node instanceof ast.Path) {
            return {
                type: 'Path',
                span: ss(node.span),
                namespace: sn(node.namespace),
                member: sn(node.member),
            };
        }
        else if (node instanceof ast.Procedure) {
            return {
                type: 'Procedure',
                name: sn(node.name),
                arguments: sn(node.arguments),
                body: sn(node.body),
            };
        }
        else if (node instanceof ast.ReturnStatement) {
            return {
                type: 'ReturnStatement',
                span: ss(node.span),
                expression: node.expression ? sn(node.expression) : null,
            };
        }
        else if (node instanceof ast.ReturnValueExpression) {
            return {type: 'ReturnValueExpression', span: ss(node.span)};
        }
        else if (node instanceof ast.RootNamespace) {
            return {type: 'RootNamespace', span: ss(node.span)};
        }
        else if (node instanceof ast.SpawnStatement) {
            return {
                type: 'SpawnStatement',
                span: ss(node.span),
                expression: sn(node.expression),
                body: sn(node.body),
            };
        }
        else if (node instanceof ast.SuperMethodExpression) {
            return {type: 'SuperMethodExpression', span: ss(node.span)};
        }
        else if (node instanceof ast.UnaryExpression) {
            return {
                type: 'UnaryExpression',
                span: ss(node.span),
                unaryType: node.unaryType,
                right: sn(node.right),
            };
        }
        else if (node instanceof ast.Unit) {
            return {
                type: 'Unit',
                span: ss(node.span),
                classes: node.classes.map((class_) => sn(class_))
            };
        }
        else if (node instanceof ast.VarStatement) {
            return {
                type: 'VarStatement',
                span: ss(node.span),
                name: sn(node.name),
                varType: node.type ? sn(node.type) : null,
                value: node.value ? sn(node.value) : null,
                isTmp: node.isTmp,
            };
        }
        else
            assert.fail('Node type not handled: ' + node.constructor.name);
    }

    static serializeUnit(unit) {
        const spanSerializer = new SpanSerializer();
        return this.serializeNode(unit, spanSerializer);
    }
}

module.exports = AstSerializer;
