## Agora Quill Fastboard Demo

Simple vanilla project demonstrating using [Fastboard](https://docs.agora.io/en/interactive-whiteboard/get-started/get-started-uikit?platform=web) and [Netless Quill App for Fastboard](https://www.npmjs.com/package/@netless/app-quill/v/0.0.1-fb.4) for collaborative text editing.

## How to run the sample project

### Install  
```bash
npm install
```

### Configure
Fill out App Identifer, region, SDK Token, and Room UUID in `/tutor.js` and `/student.js`.
Fill in your Agora APP ID and RTM Token. Note the uid you used to sign RTM token needs to match with userUuid.
```javascript
//change region if needed
const region = "us-sv";

//set app identifier here
const appid = "APP_IDENTIFIER_HERE";

//generate a room UUID with REST API and set here
const uuid = "ROOM_UUID_HERE";

const sdkToken = "SDK_TOKEN_HERE";
```

### Run

```base
npm run dev
```

## License

This sample project under the MIT license.
