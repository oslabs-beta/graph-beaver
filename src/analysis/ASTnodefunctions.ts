/* eslint-disable @typescript-eslint/no-use-before-define */
import {
    DocumentNode,
    FieldNode,
    SelectionSetNode,
    DefinitionNode,
    Kind,
    SelectionNode,
    isConstValueNode,
} from 'graphql';
import { FieldWeight, TypeWeightObject, Variables } from '../@types/buildTypeWeights';

/**
 * The AST node functions call each other following the nested structure below
 * Each function handles a specific GraphQL AST node type
 *
 * AST nodes call each other in the following way
 *
 *                        Document Node
 *                            |
 *                        Definiton Node
 *              (operation and fragment definitons)
 *                     /                \
 *  |-----> Selection Set Node         not done
 *  |               /
 *  |          Selection Node
 *  |  (Field, Inline fragment and fragment spread)
 *  |      |            \               \
 *  |--Field Node       not done       not done
 *
 */

export function fieldNode(
    node: FieldNode,
    typeWeights: TypeWeightObject,
    variables: Variables,
    parentName: string
): number {
    let complexity = 0;

    if (node.name.value.toLocaleLowerCase() in typeWeights) {
        console.log(`${node.name.value} is an object type`);
        // field is an object type with possible selections
        const { weight } = typeWeights[node.name.value];
        let selectionsCost = 0;

        // call the function to handle selection set node with selectionSet property if it is not undefined
        console.log(`selections set`, node.selectionSet);
        if (node.selectionSet) {
            selectionsCost += selectionSetNode(
                node.selectionSet,
                typeWeights,
                variables,
                node.name.value
            );
        }
        console.log(`selections cost`, selectionsCost);
        console.log(`weight`, weight);
        complexity = selectionsCost <= 1 ? selectionsCost + weight : selectionsCost * weight;
    } else {
        // field is a scalar or a list.
        const fieldWeight: FieldWeight = typeWeights[parentName].fields[node.name.value];

        if (typeof fieldWeight === 'number') {
            console.log(`${node.name.value} is an scalar type`);
            console.log(`field weight`, fieldWeight);
            // field is a scalar
            complexity += fieldWeight;
        } else {
            console.log(`${node.name.value} is a list`);
            // field is a list
            let selectionsCost = 0;
            let weight = 0;
            // call the function to handle selection set node with selectionSet property if it is not undefined
            if (node.selectionSet) {
                selectionsCost += selectionSetNode(
                    node.selectionSet,
                    typeWeights,
                    variables,
                    node.name.value
                );
            }
            if (node.arguments) {
                // BUG: This code is reached when fieldWeight is undefined, which could result from an invalid query or this type missing from the typeWeight object. If left unhandled an error is thrown
                weight += fieldWeight([...node.arguments], variables[node.name.value]);
            }
            console.log(`selections cost`, selectionsCost);
            console.log(`weight`, weight);
            complexity = selectionsCost <= 1 ? selectionsCost + weight : selectionsCost * weight;
        }
    }
    console.log(`total complexity for ${node.name.value} is ${complexity}`);
    return complexity;
}

export function selectionNode(
    node: SelectionNode,
    typeWeights: TypeWeightObject,
    variables: Variables,
    parentName: string
): number {
    let complexity = 0;
    // check the kind property against the set of selection nodes that are possible
    if (node.kind === Kind.FIELD) {
        // call the function that handle field nodes
        complexity += fieldNode(node, typeWeights, variables, parentName);
    }
    // TODO: add checks for Kind.FRAGMENT_SPREAD and Kind.INLINE_FRAGMENT here
    return complexity;
}

export function selectionSetNode(
    node: SelectionSetNode,
    typeWeights: TypeWeightObject,
    variables: Variables,
    parentName: string
): number {
    let complexity = 0;
    // iterate shrough the 'selections' array on the seletion set node
    for (let i = 0; i < node.selections.length; i += 1) {
        // call the function to handle seletion nodes
        // pass the current parent through because selection sets act only as intermediaries
        complexity += selectionNode(node.selections[i], typeWeights, variables, parentName);
    }
    return complexity;
}

export function definitionNode(
    node: DefinitionNode,
    typeWeights: TypeWeightObject,
    variables: Variables
): number {
    let complexity = 0;
    // check the kind property against the set of definiton nodes that are possible
    if (node.kind === Kind.OPERATION_DEFINITION) {
        // check if the operation is in the type weights object.
        if (node.operation.toLocaleLowerCase() in typeWeights) {
            // if it is, it is an object type, add it's type weight to the total
            complexity += typeWeights[node.operation].weight;
            console.log(`the weight of ${node.operation} is ${complexity}`);
            // call the function to handle selection set node with selectionSet property if it is not undefined
            if (node.selectionSet) {
                complexity += selectionSetNode(
                    node.selectionSet,
                    typeWeights,
                    variables,
                    node.operation
                );
            }
            console.log(`compexity of ${node.operation} is ${complexity}`);
        }
    }
    // TODO: add checks for Kind.FRAGMENT_DEFINITION here (there are other type definition nodes that i think we can ignore. see ast.d.ts in 'graphql')
    return complexity;
}

export function documentNode(
    node: DocumentNode,
    typeWeights: TypeWeightObject,
    variables: Variables
): number {
    let complexity = 0;
    // iterate through 'definitions' array on the document node
    for (let i = 0; i < node.definitions.length; i += 1) {
        // call the function to handle the various types of definition nodes
        complexity += definitionNode(node.definitions[i], typeWeights, variables);
    }
    return complexity;
}
