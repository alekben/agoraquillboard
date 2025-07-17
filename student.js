import { createFastboard, createUI, register } from "@netless/fastboard/full";


let fastboard;

//change region if needed
const region = "us-sv";

//set app identifier here
const appid = "APP_IDENTIFIER_HERE";

//generate a room UUID with REST API and set here
const uuid = "ROOM_UUID_HERE";

const sdkToken = "SDK_TOKEN_HERE";


//Fill in SDK token here to autogenerate or add it manually when creating fastboard
async function getToken() {
  const response = await fetch(`https://api.netless.link/v5/tokens/rooms/${uuid}`, {
    method: "POST",
    headers: {
      "token": sdkToken,
      "Content-Type": "application/json",
      "region": region
    },
    body: JSON.stringify({
      "lifespan": 360000000,
      "role": "writer"
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

async function main() {

  //generate random username
  const username = Math.random().toString(36).substring(2, 15);
  console.log("Username for Fastboard user for room: ", uuid, " is: ", username);

  //get token
  const token = await getToken(uuid);
  console.log("Token for Fastboard user: ", username, " for room: ", uuid, " is: ", token);
  
  //create fastboard and join
  fastboard = await createFastboard({
    sdkConfig: {
      appIdentifier: appid,
      region: region,
    },
    joinRoom: {
      uid: username,
      uuid: uuid,
      roomToken: token,
      userPayload: {
        nickName: username,
      },
      managerConfig: {
        cursor: false
      },
      callbacks: {
        onPhaseChanged: (phase) => {
          console.log(phase);
        },
        onRoomStateChanged: (modifyState) => {
          console.log(modifyState);
        },
        onDisconnectWithError: (error) => {
          console.log(error);
        }
      }},
    managerConfig: {
      cursor: true
    },
  });

  register({
    kind: 'Quill',
    src: () => import("@netless/app-quill"),
    addHooks: emitter => {
      emitter.on("focus", result => {
        console.log("Quill got focus", result);
        tempQuill = result.appId;
      });
    }
  });

  //create container and mount fastboard ui without any tools since we don't need them
  const container = createContainer();
  const ui = createUI(fastboard, container);
  ui.update({ config: {
    toolbar: { enable: false },
    redo_undo: { enable: false },
    zoom_control: { enable: false },
    page_control: { enable: false },
  }});

  //when quill app is added, either via trigger or by already being on the board, make sure it gets maximized
  fastboard.manager.emitter.on('onAppSetup', () => {
    console.log("onAppSetup");
    if (fastboard.manager.boxState !== "maximized") {
      fastboard.manager.setMaximized(true);
    }

    //hide Quill size control buttons after maximize
    const QuillTitleButtons = document.getElementsByClassName("telebox-titlebar-btns");
    Array.from(QuillTitleButtons).forEach(element => {
      element.style.display = "none"});
    //remove placeholder data text and add class with background image, if Quill editor has no content
    const quillEditor = document.getElementsByClassName("ql-editor");
    if (quillEditor && quillEditor[0].classList.contains('ql-blank')) {
      quillEditor[0].setAttribute('data-placeholder', "");
      quillEditor[0].classList.add('ql-background-image');
    };
  });

  //check if Quill is already in the room, if not, add it, hack with timeout
  const quillCheck = setTimeout(() => triggerQuill(), 500);
}

function createContainer() {
  const container = document.createElement("div");
  Object.assign(container.style, {
    height: "400px",
    border: "1px solid",
    background: "#f1f2f3",
  });
  document.body.appendChild(container);
  return container;
}

function triggerQuill() {
  //check if Quill is already in the room
  console.log("Checking if Quill is already in the room");
  const apps = fastboard.manager.queryAll();
  console.log(apps);
  let hasQuill = false;
  if (Array.isArray(apps)) {
    for (const app of apps) {
      if (app.id && app.id.includes('Quill')) {
        tempQuill = app.id;
        hasQuill = true;
        break;
      }
    }
  }
  if (hasQuill) {
    console.log("Quill already in the room");
  } else {
    console.log("Quill not in the room");
    fastboard.manager.addApp({
      kind: 'Quill',
      options: { title: "Collaboration Notes"}
    });
  }
  //start observer here after checking whether to add Quill or not, that will monitor class changes and remove new ql-background-image class when content is added
  setTimeout(() => observeQuillPlaceholder(), 500);
}

function observeQuillPlaceholder() {
  const quillEditor = document.getElementsByClassName("ql-editor")[0];
  if (!quillEditor) return;

  // Create a MutationObserver to watch for class changes
  const observer = new MutationObserver(() => {
    if (!quillEditor.classList.contains('ql-blank')) {
      // Remove background image class when content is added
      console.log("Removing background image class");
      quillEditor.classList.remove('ql-background-image');
      observer.disconnect();
    }
  });

  observer.observe(quillEditor, { attributes: true, attributeFilter: ['class'] });
}

main().catch(console.error);