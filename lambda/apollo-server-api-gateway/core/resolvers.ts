import * as log4js from 'log4js';
import {
  Author, AuthorResolvers, Post, PostResolvers, QueryAuthorArgs, QueryPostArgs, QueryResolvers, Resolvers,
} from './generated/graphql';

const logger = log4js.getLogger();

// example data
const authors: Author[] = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
  { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];

const posts = [
  {
    id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2,
  },
  {
    id: 2, authorId: 2, title: 'Welcome to Meteor', votes: 3,
  },
  {
    id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1,
  },
  {
    id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7,
  },
];

const resolvers: Resolvers = {
  Query: {
    posts: () => {
      logger.debug('Query.posts');
      return posts.map((it) => ({
        ...it,
        author: authors.find((author) => author.id === it.authorId),
      }));
    },
    post: (_, { id }: QueryPostArgs) => {
      logger.debug('Query.post');
      const item = posts.find((it) => it.id === id);
      if (!item) {
        return null;
      }
      const author = authors.find((it) => it.id === item.authorId);
      return author ? {
        ...item,
        author,
      } : null;
    },
    author: (_, { id }: QueryAuthorArgs): Author | null => {
      logger.debug('Query.author');
      return authors.find((it) => it.id === id) || null;
    },
  } as QueryResolvers,

  Mutation: {
    upvotePost(_, { postId }) {
      const post = posts.find((it) => it.id === postId);
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },

  Author: {
    posts: (author: Author): Post[] | null => {
      logger.debug('Auther.posts');
      return posts.filter((it) => it.authorId === author.id) || null;
    },
  } as AuthorResolvers,

  Post: {
    author: (post: Post): Author | null => {
      logger.debug('Post.author');
      return post.author ? authors.find((it) => it.id === post.author?.id) || null : null;
    },
  } as PostResolvers,
};

export default resolvers;
