// ======================================
// ZapChat — Emoji Picker
// ======================================

const EmojiPicker = {
  isOpen: false,

  categories: {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥱','😤','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
    people: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'],
    travel: ['✈️','🛫','🛬','🪂','💺','🚁','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','🛢️','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','🛖','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏗️','🧱'],
    objects: ['💡','🔦','🕯️','🪔','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','🧮','🎥','🎞️','📽️','📺','📷','📸','📹','📼','🔍','🔎','🕵️','💰','💴','💵','💶','💷','💳','🧾','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚰'],
    flags: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇧🇷','🇺🇸','🇵🇹','🇪🇸','🇫🇷','🇩🇪','🇮🇹','🇬🇧','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇷🇺','🇲🇽','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇻🇪','🇺🇾','🇵🇾','🇧🇴','🇪🇨','🇨🇦','🇦🇺','🇳🇿','🇿🇦','🇳🇬','🇪🇬','🇰🇪','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇭🇰','🇹🇼']
  },

  currentCategory: 'smileys',

  init() {
    this.renderEmojis();
    this.bindEvents();
  },

  bindEvents() {
    // Category buttons
    document.getElementById('emoji-categories').addEventListener('click', (e) => {
      const btn = e.target.closest('.emoji-cat-btn');
      if (!btn) return;

      document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.currentCategory = btn.dataset.cat;
      this.renderEmojis();
    });

    // Emoji click
    document.getElementById('emoji-grid').addEventListener('click', (e) => {
      const item = e.target.closest('.emoji-item');
      if (!item) return;

      const emoji = item.textContent;
      this.insertEmoji(emoji);
    });

    // Search
    document.getElementById('emoji-search').addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        this.renderEmojis();
        return;
      }
      this.searchEmojis(query);
    });
  },

  renderEmojis(emojis = null) {
    const grid = document.getElementById('emoji-grid');
    const list = emojis || this.categories[this.currentCategory] || [];
    grid.innerHTML = list.map(e => `<button class="emoji-item" type="button">${e}</button>`).join('');
  },

  searchEmojis(query) {
    // Search through all categories
    const all = Object.values(this.categories).flat();
    // Simple search: show all (emoji search by char isn't practical, just show all)
    this.renderEmojis(all);
  },

  insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.focus();

    // Insert emoji at cursor position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // If cursor is not in the input, append
    if (!input.contains(range.commonAncestorContainer)) {
      input.textContent += emoji;
    } else {
      range.deleteContents();
      range.insertNode(document.createTextNode(emoji));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Trigger input event
    input.dispatchEvent(new Event('input'));
  },

  toggle() {
    const picker = document.getElementById('emoji-picker');
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      picker.classList.remove('hidden');
      // Close attach menu
      const attachMenu = document.getElementById('attach-menu');
      attachMenu.classList.add('hidden');
    } else {
      picker.classList.add('hidden');
    }
  },

  close() {
    this.isOpen = false;
    document.getElementById('emoji-picker').classList.add('hidden');
  }
};
