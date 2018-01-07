const ast = require('../dmparser/ast');
const SpanSerializer = require('./SpanSerializer');

const assert = require('assert');

class AstSerializer {
    static serializeNode(node, spanSerializer) {
        const sn = (node) => this.serializeNode(node, spanSerializer);
        const ss = (span) => spanSerializer.serializeSpan(span);

        if (node instanceof ast.Class) {
            return {
                type: 'Class',
                span: ss(node.span),
                path: sn(node.path),
                classes: node.classDeclarations.map((class_) => sn(class_)),
                variables: node.variableDeclarations.map(([name, expression, span]) => ({
                    name: sn(name),
                    expression: sn(expression),
                    span: ss(span),
                })),
            };
        }
        else if (node instanceof ast.Ident) {
            return {type: 'Ident', span: ss(node.span), value: node.value};
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
        else if (node instanceof ast.RootNamespace) {
            return {type: 'RootNamespace', span: ss(node.span)};
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
