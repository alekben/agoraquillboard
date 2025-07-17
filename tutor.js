import { createFastboard, createUI, register } from "@netless/fastboard/full";

let tempQuill;
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
  createInputBox();

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
      cursor: false
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

function copyTextToApp(html, quillEditor) {
  // Replace <b> with <strong>, <i> with <em>
  html = html.replace(/<b>/g, "<strong>").replace(/<\/b>/g, "</strong>");
  html = html.replace(/<i>/g, "<em>").replace(/<\/i>/g, "</em>");
  // Remove wrapping <div> or <p> around <ul>
  html = html.replace(/<div>\s*(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)\s*<\/div>/g, "$1");
  html = html.replace(/<p>\s*(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)\s*<\/p>/g, "$1");
  quillEditor[0].innerHTML += html;
}

function createInputBox() {
  // Create wrapper div
  const wrapper = document.createElement("div");
  wrapper.style.marginBottom = "12px";

  // Create formatting buttons container
  const buttonContainer = document.createElement("div");
  buttonContainer.style.marginBottom = "8px";

  // Create Bold button
  const boldButton = document.createElement("button");
  boldButton.textContent = "Bold";
  boldButton.style.marginRight = "8px";
  boldButton.onclick = () => {
    document.execCommand('insertHTML', false, `<b>${getSelectedText()}</b>`);
  };

  // Create Italic button
  const italicButton = document.createElement("button");
  italicButton.textContent = "Italic";
  italicButton.style.marginRight = "8px";
  italicButton.onclick = () => {
    document.execCommand('insertHTML', false, `<i>${getSelectedText()}</i>`);
  };

  // Create List button
  const listButton = document.createElement("button");
  listButton.textContent = "List";
  listButton.style.marginRight = "8px";
  listButton.onclick = () => {
    const selectedText = getSelectedText();
    if (selectedText) {
      const lines = selectedText.split('\n').filter(line => line.trim());
      const listItems = lines.map(line => `<li>${line}</li>`).join('');
      document.execCommand('insertHTML', false, `<ul>${listItems}</ul>`);
    } else {
      document.execCommand('insertHTML', false, '<ul><li>List item</li></ul>');
    }
  };

  // Add buttons to container
  buttonContainer.appendChild(boldButton);
  buttonContainer.appendChild(italicButton);
  buttonContainer.appendChild(listButton);

  // Create contenteditable div (replaces textarea)
  const contentDiv = document.createElement("div");
  contentDiv.contentEditable = true;
  contentDiv.style.height = "300px"; // Approximately 15 lines
  contentDiv.style.width = "100%";
  contentDiv.style.boxSizing = "border-box";
  contentDiv.style.display = "block";
  contentDiv.style.marginBottom = "8px";
  contentDiv.style.border = "1px solid #ccc";
  contentDiv.style.padding = "8px";
  contentDiv.style.fontFamily = "Arial, sans-serif";
  contentDiv.style.fontSize = "14px";
  contentDiv.style.overflowY = "auto";
  contentDiv.style.backgroundColor = "white";
  contentDiv.placeholder = "Enter text here...";

  // Create button to copy to Quill app
  const button = document.createElement("button");
  button.textContent = "Copy to App";
  button.style.marginRight = "8px";
  button.onclick = () => {
    //get quill editor
    const quillEditor = document.getElementsByClassName("ql-editor");
    console.log(quillEditor);
    copyTextToApp(contentDiv.innerHTML, quillEditor);
  };

  // Create button to copy from Quill app
  const buttonFrom = document.createElement("button");
  buttonFrom.textContent = "Copy From App";
  buttonFrom.style.marginRight = "8px";
  buttonFrom.onclick = () => {
    const quillEditor = document.getElementsByClassName("ql-editor");
    if (quillEditor.length > 0) {
      contentDiv.innerHTML = quillEditor[0].innerHTML;
    }
  };

  // Create button for getting Quill app
  const btnGetQuill = document.createElement("button");
  btnGetQuill.textContent = "Get Quill Editor Text from App Object";
  buttonFrom.style.marginRight = "8px";
  btnGetQuill.onclick = () => {
    const quill = fastboard.manager.queryOne(tempQuill);
    console.log(quill);
    const quillText = quill.appResult.$editor.innerText;
    alert(quillText);
  };

  wrapper.appendChild(buttonContainer);
  wrapper.appendChild(contentDiv);
  wrapper.appendChild(button);
  wrapper.appendChild(buttonFrom);
  wrapper.appendChild(btnGetQuill);
  document.body.insertBefore(wrapper, document.body.firstChild);
}

// Helper function to get selected text
function getSelectedText() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    return range.toString();
  }
  return '';
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