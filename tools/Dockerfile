FROM alpine
RUN apk add --no-cache nodejs npm clang lld binaryen
WORKDIR /srv
CMD ["npm", "run", "build"]
