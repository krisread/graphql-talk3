const express = require('express')
const {  ApolloServer, gql } = require('apollo-server-express')
const { makeExecutableSchema, makeRemoteExecutableSchema, mergeSchemas, introspectSchema } = require('graphql-tools');
const { books } = require('./lib/data')
const { HttpLink } = require('apollo-link-http')
const fetch = require('node-fetch')

let server, schema

// The GraphQL schema in string form
const typeDefs = gql`

  type Query { 
    books: [Book]
  }
  
  type Book {
    title: String!
    authorId: Int
  }
  
`

// The resolvers
const resolvers = {

  Query: {
    books: () => {
      console.log('Fetching books')
      return Object.values(books)
    }
  }

}

// Put together a local schema
const bookSchema = makeExecutableSchema({ typeDefs, resolvers })


async function init() {

  // Setup the HTTP connection to retrieve downstream schema data
  const link = new HttpLink({ uri: 'http://localhost:3001/graphql', fetch })

  // Introspect through the link to get the schema definition
  const introspectedSchema = await introspectSchema(link)

  const remoteSchema = makeRemoteExecutableSchema({ link,
    schema: introspectedSchema
  })

  // Merge the local and remote schemas
  schema = mergeSchemas({
    schemas: [ bookSchema, remoteSchema, `
      extend type Book {
        author: Author
      }
    `],
    resolvers: {

      Book: {
        author: {
          fragment: `... on Book { authorId }`,
          resolve(book, args, context, info) {
            return info.mergeInfo.delegateToSchema({
              schema: remoteSchema,
              operation: 'query',
              fieldName: 'author',
              args: { id: book.authorId },
              context,
              info
            })
          }
        }
      }

    }
  })

}

// Initialize the app
const app = express()

// Start the server
init().then(() => {

  const server = new ApolloServer({ schema })
  server.applyMiddleware({ app })
  
  // Start the server
  app.listen(3000, () => {
    console.log(`Go to http://localhost:3000${server.graphqlPath} to run queries!`)
  })
  
}).catch(err => console.error(err))



// Shut down the express server!
function shutdown(error) {
  error ? console.error(error) : console.log('shutting down')
  try {
    if (server) server.close()
  } catch (err) {
    // noop who cares
  }
  process.exit(error ? 1 : 0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)