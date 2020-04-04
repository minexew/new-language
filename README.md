# dmparser

![Image](https://travis-ci.org/byojs/dmparser.svg?branch=master)

## Flow

### Lex

- Input: source file
- Output: stream of tokens

### Parser

- Input: stream of tokens
- Output: abstract syntax tree

### Semantic compiler

- Input: abstract syntax tree
- Output: program model

#### Program model

- list of ALL types (also anonymous tuples etc.)
- list of all functions
    - bodies AST-like but resolved
        - every expression type-annotated

### Transpiler

- Input: program model
- Output: C
