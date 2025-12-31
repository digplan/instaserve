window.login = () => {
  window.location.href = `${window.apiurl}/login`;
}

window.logout = () => {
  window.location.href = `${window.apiurl}/logout`;
}

window.loggedIn = () => {
  return document.cookie.includes("loggedIn=true");
}

window.api = (method, url, body) => {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  return fetch(`${window.apiurl}${url}`, opts);
}

window.get = async (key) => {
  return (await window.api('GET', `/api?key=${key}`)).json()
}

window.set = async (key, value) => {
  return (await window.api('POST', `/api`, { key, value })).json()
}

window.del = async (key) => {
  return (await window.api('DELETE', `/api`, { key })).json()
}

window.all = async () => {
  return (await window.api('GET', `/all`)).json()
}

window.listFiles = async () => {
  return (await window.api('POST', `/files`)).json()
}

window.subscribe = (callback) => {
  const evtSource = new EventSource(`${window.apiurl}/sse`, { withCredentials: true });
  evtSource.onmessage = (event) => {
    try {
      callback(JSON.parse(event.data));
    } catch (e) {
      callback(event.data);
    }
  };
  return evtSource;
}

class FileWidget extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.innerHTML.trim()) {
      this.innerHTML = `
        <ul id="files" style="list-style: none; padding: 0;"></ul>
        <div style="margin-top: 10px; display: flex; gap: 8px;">
          <input type="file" id="file" class="input-field">
          <button id="upload" class="btn-sm">Upload</button>
        </div>
      `;
    }

    this.refreshFiles();

    const uploadBtn = this.querySelector("#upload");
    if (uploadBtn) {
      uploadBtn.onclick = async () => {
        const fileInput = this.querySelector("#file");
        const file = fileInput.files[0];
        if (!file) return alert("Please select a file first.");

        // Convert to Base64 for JSON upload (required by r2.js)
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            await window.api('POST', '/upload', {
              key: file.name,
              body: base64,
              contentType: file.type
            });
            fileInput.value = ""; // Clear input
            this.refreshFiles();
          } catch (e) {
            console.error("Upload failed", e);
            alert("Upload failed: " + e.message);
          }
        };
        reader.readAsDataURL(file);
      };
    }
  }

  async refreshFiles() {
    try {
      const files = await window.listFiles();
      const ul = this.querySelector("#files");
      if (!ul) return;
      ul.innerHTML = "";

      if (Array.isArray(files)) {
        files.forEach(f => {
          const fileName = f.key || f; // Handle object or string
          const li = document.createElement("li");
          li.style.marginBottom = "8px";
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.gap = "10px";

          const nameSpan = document.createElement("span");
          nameSpan.textContent = fileName;

          const download = document.createElement("a");
          download.href = `${window.apiurl}/download?key=${encodeURIComponent(fileName)}`;
          download.textContent = "Download";
          download.download = fileName;
          download.className = "btn-sm";
          download.style.textDecoration = "none";
          download.style.fontSize = "0.8rem";

          const del = document.createElement("button");
          del.textContent = "Delete";
          del.className = "btn-sm";
          del.style.color = "red";
          del.style.borderColor = "#ffcccc";
          del.style.fontSize = "0.8rem";
          del.onclick = async () => {
            if (confirm('Delete ' + fileName + '?')) {
              await window.api('DELETE', '/delete', { key: fileName });
              this.refreshFiles();
            }
          };

          li.appendChild(nameSpan);
          li.appendChild(download);
          li.appendChild(del);
          ul.appendChild(li);
        });
      }
    } catch (e) {
      console.error("Error listing files:", e);
    }
  }
}

customElements.define("file-widget", FileWidget);


class KVWidget extends HTMLElement {
  connectedCallback() {
    if (!this.innerHTML.trim()) {
      this.innerHTML = `
      <div style="border: 1px solid #eee; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
        <h3 style="margin-top: 0;">KV Store</h3>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input id="kv-key" placeholder="Key" class="input-field" style="flex: 1;">
          <input id="kv-val" placeholder="Value" class="input-field" style="flex: 1;">
        </div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <button id="btn-set" class="btn-sm">Set</button>
          <button id="btn-get" class="btn-sm">Get</button>
          <button id="btn-del" class="btn-sm">Del</button>
          <button id="btn-list" class="btn-sm">List All</button>
        </div>
        <pre id="kv-out" style="background:#f4f4f5; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; min-height: 2rem; overflow: auto;"></pre>
      </div>`;
    }

    const log = (msg) => this.querySelector('#kv-out').textContent = JSON.stringify(msg, null, 2);
    const k = () => this.querySelector('#kv-key').value;
    const v = () => this.querySelector('#kv-val').value;

    this.querySelector('#btn-set').onclick = async () => log(await window.set(k(), v()));
    this.querySelector('#btn-get').onclick = async () => log(await window.get(k()));
    this.querySelector('#btn-del').onclick = async () => log(await window.del(k()));
    this.querySelector('#btn-list').onclick = async () => log(await window.all());
  }
}

class SSEWidget extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="border: 1px solid #eee; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
        <h3 style="margin-top: 0;">SSE Events</h3>
        <div id="sse-log" style="background:#f4f4f5; padding: 0.5rem; border-radius: 4px; font-size: 0.85rem; height: 100px; overflow-y: auto;">
          <div style="color: #666; font-style: italic;">Waiting for events...</div>
        </div>
      </div>`;

    const log = this.querySelector('#sse-log');

    // Subscribe
    this.es = window.subscribe((data) => {
      const div = document.createElement('div');
      div.textContent = typeof data === 'object' ? JSON.stringify(data) : data;
      div.style.borderBottom = '1px solid #ddd';
      div.style.padding = '2px 0';
      // Remove "Waiting..." if present
      if (log.querySelector('div')?.style.fontStyle === 'italic') log.innerHTML = '';
      log.prepend(div);
    });
  }

  disconnectedCallback() {
    if (this.es) this.es.close();
  }
}
customElements.define('sse-widget', SSEWidget);

customElements.define("kv-widget", KVWidget);
