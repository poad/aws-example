const resolvers = {
  Query: {
    hello: (_: any, args: { [key: string]: string | number }) => (args.message ? args.message.toString() : 'Hello, World!'),
    dump: (_: any, args: { [key: string]: string | number }, context: any) => {
      const message = args.message?.toString();
      const headers = JSON.stringify(context.headers);
      return { message, headers };
    },

  },
};

export default resolvers;
