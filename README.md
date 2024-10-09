# Simple WhatsApp Bot by AstroX10

**Simple bot created by AstroX10 that enhances your WhatsApp experience by automating various tasks. With this bot, you can easily manage your groups, download videos, convert files, and perform utility actions effortlessly.**

---

## 🔐 Important Notice

This project uses a **custom server** for effective management of authentication state, overcoming the limitations of `app state keys`, which do not regenerate automatically from `creds.json`. The server securely stores your session data for **1 Week**, giving you enough time to retrieve it and providing a unique **secret key** for exclusive access.

This setup is managed by the [Session Manager](https://github.com/AstroX10/session-manager) and [Session Generator](https://github.com/AstroX10/whatsapp-bot-session), hosted as an **open-source solution** on Render. **I do not have access to your data.**

For your security:

- **Never share your session ID `Access Key` with anyone**, including myself.
- The 1 week data retention period is designed as a safety measure to prevent unauthorized access.

This project is open source and created for the community by AstroX10, with a strong commitment to **safety** and **privacy**. Stay safe!

---

## 🚀 Setup Instructions

### 1. Fork Your Copy

[![Fork Repo](https://img.shields.io/badge/Fork%20Repo-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black)](https://github.com/AstroX10/whatsapp-bot/fork)

### 2. Get Session ID (Online Method)

[![Session ID](https://img.shields.io/badge/Session%20ID-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black)](https://fxoprisa.vercel.app/)

### 3. Get Session ID Locally (For More Privacy)

If you prefer not to use the online method, you can get the session ID locally using:
[![Session ID](https://img.shields.io/badge/Session%20ID%20Local-100000?style=for-the-badge&logo=scan&logoColor=white&labelColor=black&color=black)](https://github.com/AstroX10/whatsapp-bot-session)

### 4. Set Up Environment Variables

Add the following environment variables to your platform:

| Variable             | Description                                          |
| -------------------- | ---------------------------------------------------- |
| **SESSION_ID**       | Your session ID                                      |
| **HANDLERS**         | Symbol to trigger commands (e.g., `!` or `.`)        |
| **WORK_TYPE**        | Mode (`public` or `private`)                         |
| **BOT_INFO**         | Bot details (e.g., `Astro,fxop;https://image.jpg`)   |
| **AUTO_READ**        | Auto-read incoming messages (`true` or `false`)      |
| **AUTO_STATUS_READ** | Auto-read status updates (`true` or `false`)         |
| **SUDO**             | Owner numbers (`91234567899,92336829223,9474839234`) |

---

## 📋 Custom Commands

### Creating a Command

```javascript
const { bot } = require('../utils'); // Plugins Manager Handles Plugins

bot(
  {
    pattern: 'test', // Name of your command
    fromMe: false, // True for only you, regardless of the mode
    desc: 'A Test Command', // Description of the command
    type: 'plugins', // Category for grouping commands in the menu
  },
  async (message, match, m, client) => {
    // Define what the command does here

    const saveMedia = m.quoted.download(); // Downloads a replied Image, Video, or ViewOnce
    const query = match; // Custom query requirements

    if (!query) return await message.reply('_Provide a query!_'); // Ensure the user inputs a query

    const replied = message.reply_message || message.reply_audio; // Ensure a reply exists

    if (!replied) return await message.reply('_You must reply to a message!_'); // Return if not a reply

    return await client.sendMessage(
      message.jid,
      {
        text: `Test successful`,
      },
      {
        quoted: message,
      }
    );
  }
);
```

---

## ✨ Usage Examples

### 1. **Sending a Text Message**

```javascript
await send('Hello, this is a test message!', {
  jid: '1234567890@s.whatsapp.net',
});
```

### 2. **Sending a Text Message with Quoted Message**

```javascript
const quotedMessage = {
  key: {
    remoteJid: '1234567890@s.whatsapp.net',
    id: 'ABC123XYZ',
  },
  mtype: 'conversation',
  message: {
    conversation: 'This is the original message being quoted.',
  },
};
await send('This is a reply to the quoted message.', {
  jid: '1234567890@s.whatsapp.net',
  quoted: quotedMessage,
});
```

### 3. **Sending an Image Message**

```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('./path/to/image.jpg');
await send(imageBuffer, {
  jid: '1234567890@s.whatsapp.net',
});
```

### 4. **Sending a Video Message**

```javascript
await send('https://example.com/path/to/video.mp4', {
  jid: '1234567890@s.whatsapp.net',
});
```

### 5. **Sending a Document or PDF File**

```javascript
const pdfBuffer = fs.readFileSync('./path/to/document.pdf');
await send(pdfBuffer, {
  jid: '1234567890@s.whatsapp.net',
  type: 'document',
  mimetype: 'application/pdf',
});
```

### 6. **Sending an Interactive Message**

```javascript
const interactiveContent = {
  text: 'Choose an option:',
  footer: 'Please select one:',
  buttons: [
    {
      buttonId: 'option1',
      buttonText: {
        displayText: 'Option 1',
      },
      type: 1,
    },
    {
      buttonId: 'option2',
      buttonText: {
        displayText: 'Option 2',
      },
      type: 1,
    },
  ],
  headerType: 1,
};
await send(interactiveContent, {
  jid: '1234567890@s.whatsapp.net',
  type: 'interactive',
});
```

### 7. **Sending a Sticker Message**

```javascript
const stickerBuffer = fs.readFileSync('./path/to/sticker.webp');
await send(stickerBuffer, {
  jid: '1234567890@s.whatsapp.net',
  type: 'sticker',
});
```

---

## 📜 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute the software, provided that the original license and copyright notice are included.

### FOSSA Status

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot.svg?type=shield&issueType=security)](https://app.fossa.com/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot?ref=badge_shield&issueType=security)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2FAstroX10%2Fwhatsapp-bot?ref=badge_shield&issueType=license)
