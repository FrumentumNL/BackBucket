FROM node:23-alpine
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY ./ /app
RUN npm i -g pnpm
RUN echo node-linker=hoisted > .npmrc
RUN pnpm fetch --no-frozen-lockfile
CMD ["pnpm", "start"]
