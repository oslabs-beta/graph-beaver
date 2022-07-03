import 'ts-jest';
import { buildSchema, DocumentNode, parse } from 'graphql';
import { TypeWeightObject } from '../../src/@types/buildTypeWeights';
import buildTypeWeightsFromSchema from '../../src/analysis/buildTypeWeights';
import getQueryTypeComplexity from '../../src/analysis/typeComplexityAnalysis';
// Test the weight function generated by the typeweights object when a limiting keyword is provided

// Test cases:
// Default value provided to schema
// Arg passed in as variable
// Arg passed in as scalar
// Invalid arg type provided

// Default value passed with query

describe('Weight Function correctly parses Argument Nodes if', () => {
    const schema = buildSchema(`
        type Query {
            reviews(episode: Episode!, first: Int = 5): [Review]
            heroes(episode: Episode!, first: Int): [Review]
            villains(episode: Episode!, limit: Int! = 3): [Review] 
            characters(episode: Episode!, limit: Int!): [Review] 
        }
        type Review {
            episode: Episode
            stars: Int!
            commentary: String
        }
        enum Episode {
            NEWHOPE
            EMPIRE
            JEDI
        }`);

    // building the typeWeights object here since we're testing the weight function created in
    // the typeWeights object
    const typeWeights: TypeWeightObject = buildTypeWeightsFromSchema(schema);

    describe('a default value is provided in the schema', () => {
        test('and a value is not provided with the query', () => {
            const query = `query { reviews(episode: NEWHOPE) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            expect(getQueryTypeComplexity(queryAST, {}, typeWeights)).toBe(6);
        });

        test('and a scalar value is provided with the query', () => {
            const query = `query { reviews(episode: NEWHOPE, first: 3) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            expect(getQueryTypeComplexity(queryAST, {}, typeWeights)).toBe(4);
        });

        test('and the argument is passed in as a variable', () => {
            const query = `query variableQuery ($items: Int){ reviews(episode: NEWHOPE, first: $items) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            expect(getQueryTypeComplexity(queryAST, { items: 7, first: 4 }, typeWeights)).toBe(8);
            expect(getQueryTypeComplexity(queryAST, { first: 4, items: 7 }, typeWeights)).toBe(8);
        });
    });

    describe('a default value is not provided in the schema', () => {
        test('and a value is not provied with the query', () => {
            const query = `query { heroes(episode: NEWHOPE) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            // FIXME: Update expected result if unbounded lists are suppored
            expect(getQueryTypeComplexity(queryAST, {}, typeWeights)).toBe(5);
        });

        test('and a scalar value is provided with the query', () => {
            const query = `query { heroes(episode: NEWHOPE, first: 3) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            expect(getQueryTypeComplexity(queryAST, {}, typeWeights)).toBe(4);
        });

        test('and the argument is passed in as a variable', () => {
            const query = `query variableQuery ($items: Int){ heroes(episode: NEWHOPE, first: $items) { stars, episode } }`;
            const queryAST: DocumentNode = parse(query);
            expect(getQueryTypeComplexity(queryAST, { items: 7 }, typeWeights)).toBe(8);
        });
    });

    test('a custom object weight was configured', () => {
        const customTypeWeights: TypeWeightObject = buildTypeWeightsFromSchema(schema, {
            object: 3,
        });
        const query = `query { heroes(episode: NEWHOPE, first: 3) { stars, episode } }`;
        const queryAST: DocumentNode = parse(query);
        expect(getQueryTypeComplexity(queryAST, {}, customTypeWeights)).toBe(10);
    });

    test('variable names matching limiting keywords do not interfere with scalar argument values', () => {
        const query = `query variableQuery ($items: Int){ heroes(episode: NEWHOPE, first: 3) { stars, episode } }`;
        const queryAST: DocumentNode = parse(query);
        expect(getQueryTypeComplexity(queryAST, { first: 7 }, typeWeights)).toBe(4);
    });

    xtest('an invalid arg type is provided', () => {
        const query = `query { heroes(episode: NEWHOPE, first = 3) { stars, episode } }`;
        const queryAST: DocumentNode = parse(query);
        // FIXME: What is the expected behavior? Treat as unbounded?
        fail('test not implemented');
    });
});
