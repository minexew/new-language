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
                arguments: node.arguments.map(([name, type, inputType]) => ({
                    name: sn(name),
                    type: type ? sn(type) : null,
                    inputType: inputType ? sn(inputType) : null,
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
                classes: node.classDeclarations.map((class_) => sn(class_)),
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
        else if (node instanceof ast.ExpressionStatement) {
            return {
                type: 'ExpressionStatement',
                span: ss(node.span),
                expression: sn(node.expression),
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
            };
        }
        else if (node instanceof ast.LiteralInteger) {
            return {type: 'LiteralInteger', span: ss(node.span), value: node.value};
        }
        else if (node instanceof ast.LiteralString) {
            return {type: 'LiteralString', span: ss(node.span), text: node.text, singleQuoted: node.singleQuoted};
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
        else if (node instanceof ast.RootNamespace) {
            return {type: 'RootNamespace', span: ss(node.span)};
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
                classes: node.classDeclarations.map((class_) => sn(class_))
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
