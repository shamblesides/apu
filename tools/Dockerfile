FROM alpine
RUN apk add --no-cache nodejs npm make clang lld binaryen
WORKDIR /srv
CMD ["npm", "run", "build"]
