const songs = ["どないせぇちゅうのん??", "仕事", "白昼夢", "喫酒", "ファクトリーガール", "今夜は朝まで"];
const catalogue = [
  { release: "我儘", tracks: ["我儘", "仕事", "さわれない", "にぎりこぶし"] },
  { release: "日常柄", tracks: ["どないせぇちゅうのん??", "頑張れ!!ダメ人間!!", "白昼夢", "日々のあぶく", "今夜は朝まで"] },
  { release: "表面張力", tracks: ["マジックアワー", "ハリボテのブルース (The mammy rows Ver.)", "ミッドナイトダンサー", "ファクトリーガール", "我慢", "喫酒"] },
  { release: "LIVE SONGS", tracks: ["出囃子", "ざまぁみさらせ", "労働アレルギー", "よろこびの唄", "手のひら", "ぎゃふん!!"] }
];
const editor = document.querySelector("#track-editor");
const preview = document.querySelector("#preview-tracks");
const addButton = document.querySelector("#add-song");
const songCount = document.querySelector("#song-count");
const picker = document.querySelector("#song-picker");
const library = document.querySelector("#song-library");
let activeTrack = 0;

function render() {
  editor.innerHTML = "";
  preview.innerHTML = "";
  songs.forEach((song, index) => {
    const row = document.createElement("li");
    row.className = "track-row";
    row.innerHTML = `<span class="track-no">${String(index + 1).padStart(2, "0")}</span><input class="track-name" aria-label="${index + 1}曲目" maxlength="40"><button class="choose-song" aria-label="${index + 1}曲目を選ぶ">選曲</button><button class="icon-button up" aria-label="上へ移動">↑</button><button class="icon-button down" aria-label="下へ移動">↓</button><button class="icon-button remove" aria-label="削除">×</button>`;
    const input = row.querySelector("input");
    input.value = song;
    input.addEventListener("input", () => { songs[index] = input.value; updatePreview(); });
    row.querySelector(".up").disabled = index === 0;
    row.querySelector(".down").disabled = index === songs.length - 1;
    row.querySelector(".remove").disabled = songs.length <= 1;
    row.querySelector(".choose-song").addEventListener("click", () => openPicker(index));
    row.querySelector(".up").addEventListener("click", () => move(index, -1));
    row.querySelector(".down").addEventListener("click", () => move(index, 1));
    row.querySelector(".remove").addEventListener("click", () => { if (songs.length > 1) { songs.splice(index, 1); render(); } });
    editor.appendChild(row);
  });
  addButton.disabled = songs.length >= 7;
  songCount.textContent = `${songs.length} ${songs.length === 1 ? "SONG" : "SONGS"}`;
  document.querySelector("#paper").dataset.count = songs.length;
  updatePreview();
}

function openPicker(index) {
  activeTrack = index;
  picker.showModal();
}

catalogue.forEach(group => {
  const section = document.createElement("section");
  section.className = "song-group";
  section.innerHTML = `<h3>${group.release}</h3><div class="song-options"></div>`;
  const options = section.querySelector(".song-options");
  group.tracks.forEach(track => {
    const button = document.createElement("button");
    button.className = "song-option";
    button.textContent = track;
    button.addEventListener("click", () => {
      songs[activeTrack] = track;
      picker.close();
      render();
      editor.children[activeTrack].querySelector("input").focus();
    });
    options.appendChild(button);
  });
  library.appendChild(section);
});

document.querySelector("#close-picker").addEventListener("click", () => picker.close());
picker.addEventListener("click", event => { if (event.target === picker) picker.close(); });

function move(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= songs.length) return;
  [songs[index], songs[target]] = [songs[target], songs[index]];
  render();
  editor.children[target].querySelector("input").focus();
}

function updatePreview() {
  preview.innerHTML = "";
  document.querySelector("#paper").classList.toggle("has-long-title", songs.some(song => song.length > 23));
  songs.forEach(song => {
    const item = document.createElement("li");
    item.textContent = song.trim() || "UNTITLED";
    preview.appendChild(item);
  });
}

function bindText(inputId, previewId, fallback) {
  const input = document.querySelector(`#${inputId}`);
  const output = document.querySelector(`#${previewId}`);
  input.addEventListener("input", () => { output.textContent = input.value.trim() || fallback; });
}

bindText("live-title", "preview-title", "LIVE TITLE");
bindText("live-date", "preview-date", "DATE");
bindText("venue", "preview-venue", "VENUE");
addButton.addEventListener("click", () => { if (songs.length < 7) { songs.push("新しい曲"); render(); editor.lastElementChild.querySelector("input").select(); } });
document.querySelector("#print").addEventListener("click", () => window.print());
document.addEventListener("dblclick", event => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
render();
