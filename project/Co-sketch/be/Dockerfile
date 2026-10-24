FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm i 

COPY . .

EXPOSE 3001

CMD ["node","index.js"]


