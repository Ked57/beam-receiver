# beam-receiver

A torrent service wrote in NodeJS

## Installation

This app is meant to be run using docker for production

### Docker

Coming soon

### Developement

#### Env variables

Copy paste `.env.example` and rename it to `.env`

Provide the required env variables

```
BEAM_PORT => Port exposed by the app
BEAM_CONFIGPATH => Path the to config file, must be json
```

#### Install

Simply run `npm i`

#### Build and serve

Again it's very simple `npm run start:dev`
The `:dev` is there to start the app using dotenv and provide the environment variables

#### Watch

Run `npm run dev`
The app will start using nodemon
