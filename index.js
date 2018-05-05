const express = require('express');
const bodyParser = require('body-parser');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const { books, authors } = require('./lib/data');

// The GraphQL schema in string form
const typeDefs = `

  type Query { 
    books: [Book]
  }
  
  type Book {
    title: String!
    author: Author!
  }
  
  type Author {
    name: String!
  }

`;

// The resolvers
const resolvers = {

  Query: {
    books: () => {
      return Object.values(books);
    }
  },

  Book: {
    author: (book) => {
      return authors[book.author];
    }
  }

};

// Put together a schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Initialize the app
const app = express();

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

// Start the server
app.listen(3000, () => {
  console.log('Go to http://localhost:3000/graphiql to run queries!');
});